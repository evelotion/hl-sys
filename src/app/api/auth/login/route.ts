// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from '@/src/lib/db';
import { createSessionPayload, signSession, sessionMaxAgeSeconds, SESSION_COOKIE_NAME } from '@/src/lib/session';

const GENERIC_ERROR = 'Inisial atau password salah.';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userInitial = typeof body.initial === 'string' ? body.initial : (typeof body.nip === 'string' ? body.nip : '');
    const password = typeof body.password === 'string' ? body.password : '';

    if (!userInitial || !password) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const upperInitial = userInitial.toUpperCase();
    const user = await db.user.findUnique({ where: { initial: upperInitial } });

    if (!user) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    let passwordOk = false;

    if (user.password.startsWith('$2')) {
      passwordOk = await bcrypt.compare(password, user.password);
    } else if (user.password === password) {
      // Kompatibilitas data lama: password plaintext, upgrade ke bcrypt setelah cocok.
      passwordOk = true;
      const hashed = await bcrypt.hash(password, 10);
      await db.user.update({ where: { id: user.id }, data: { password: hashed } });
    }

    if (!passwordOk) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const payload = createSessionPayload(user.id, user.role);
    const token = await signSession(payload);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionMaxAgeSeconds(payload),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
