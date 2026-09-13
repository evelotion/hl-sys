// src/lib/auth.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { db } from './db';
import { SESSION_COOKIE_NAME, verifySession } from './session';
import { can, type Permission, type SessionUser, type TicketContext } from './roles';

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySession(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, initial: true, name: true, role: true, team: true, sessionsValidFrom: true },
  });
  if (!user) return null;

  // Token diterbitkan sebelum password terakhir berubah (login upgrade plaintext->hash,
  // ganti password sendiri, atau reset oleh user:manage) -> anggap sesi lama sudah dibatalkan.
  if (payload.iat < user.sessionsValidFrom.getTime()) return null;

  return { id: user.id, initial: user.initial, name: user.name, role: user.role, team: user.team, sid: payload.sid };
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Dipakai di API route: lempar AuthError(401) kalau session tidak valid. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, 'Unauthorized');
  return user;
}

/** Dipakai di API route: lempar AuthError(401/403) sesuai permission. */
export async function requirePermission(permission: Permission, ctx?: TicketContext): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission, ctx)) throw new AuthError(403, 'Forbidden');
  return user;
}

/** Tangkap AuthError di catch block API route, kembalikan NextResponse atau null kalau bukan AuthError. */
export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

/** Dipakai di Server Component (page.tsx): redirect ke /login kalau session tidak valid. */
export async function requireUserForPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
