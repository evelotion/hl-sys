// src/app/api/users/change-password/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/src/lib/auth';
import { createSessionPayload, signSession, sessionMaxAgeSeconds, SESSION_COOKIE_NAME } from '@/src/lib/session';

export async function POST(request: Request) {
  try {
    const { oldPassword, newPassword } = await request.json();

    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'Sesi telah berakhir. Silakan login ulang.' }, { status: 401 });
    }

    if (sessionUser.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Akun Pemantau tidak dapat mengubah password.' }, { status: 403 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Password baru minimal 8 karakter.' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    const isPasswordMatch = await bcrypt.compare(typeof oldPassword === 'string' ? oldPassword : '', user.password);
    if (!isPasswordMatch) {
      return NextResponse.json({ success: false, error: 'Password lama yang Anda masukkan salah.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: sessionUser.id },
      data: { password: hashedPassword, sessionsValidFrom: new Date() },
    });

    // Bump sessionsValidFrom di atas membatalkan SEMUA sesi user ini, termasuk sesi yang
    // sedang dipakai untuk memanggil endpoint ini sendiri. Terbitkan session token baru
    // supaya pengguna yang baru saja ganti password sendiri tidak ikut ter-logout —
    // hanya sesi di perangkat lain yang seharusnya kena.
    const payload = createSessionPayload(sessionUser.id, sessionUser.role);
    const token = await signSession(payload);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionMaxAgeSeconds(payload),
    });

    return NextResponse.json({ success: true, message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change Password Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
