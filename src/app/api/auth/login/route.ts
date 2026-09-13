// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from '@/src/lib/db';
import { createSessionPayload, signSession, sessionMaxAgeSeconds, SESSION_COOKIE_NAME } from '@/src/lib/session';

const GENERIC_ERROR = 'Inisial atau password salah.';
const RATE_LIMIT_ERROR = 'Terlalu banyak percobaan login untuk inisial ini. Coba lagi dalam beberapa menit.';

// Hash bcrypt tetap (bukan dari akun mana pun) khusus untuk menyamakan waktu respons
// ketika inisial tidak ditemukan, supaya tidak bisa dibedakan dari inisial yang salah password.
const DUMMY_HASH = '$2b$10$qvOYHHKjeGAGVY/RGBJxne18JXWbmTnsrI5RicAdEBAJTitJ6YZMO';

// Rate limit sederhana, di memori proses saja (bukan persisten, cukup untuk memperlambat
// brute force kasar; reset kalau server restart, dan tidak terbagi antar instance).
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_MAX = 5;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_ATTEMPT_MAX;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.windowStart > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userInitial = typeof body.initial === 'string' ? body.initial : (typeof body.nip === 'string' ? body.nip : '');
    const password = typeof body.password === 'string' ? body.password : '';

    if (!userInitial || !password) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const upperInitial = userInitial.toUpperCase();

    if (isRateLimited(upperInitial)) {
      return NextResponse.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
    }

    const user = await db.user.findUnique({ where: { initial: upperInitial } });

    if (!user) {
      // Tetap jalankan bcrypt.compare ke hash dummy supaya waktu respons sama
      // dengan kasus inisial ditemukan tapi password salah.
      await bcrypt.compare(password, DUMMY_HASH);
      recordFailedAttempt(upperInitial);
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
      recordFailedAttempt(upperInitial);
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    clearAttempts(upperInitial);

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
