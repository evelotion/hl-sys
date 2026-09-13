// src/app/api/users/change-password/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/src/lib/auth';

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
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change Password Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
