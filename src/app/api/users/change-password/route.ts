// src/app/api/users/change-password/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { oldPassword, newPassword } = await request.json();

    // 1. Ambil session user yang lagi login
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('user_session')?.value;
    
    if (!sessionStr) {
      return NextResponse.json({ success: false, error: "Sesi telah berakhir. Silakan login ulang." }, { status: 401 });
    }

    const sessionUser = JSON.parse(sessionStr);
    const userId = sessionUser.id;

    // 2. Cari user di database
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    // 3. Validasi Password Lama (Bypass untuk kemudahan testing jika DB belum pakai hash)
    // Cek apakah password di DB sama persis (plain text, contoh: 'password123') atau di-hash
    const isPasswordMatch = 
      user.password === oldPassword || 
      (await bcrypt.compare(oldPassword, user.password));

    if (!isPasswordMatch) {
      return NextResponse.json({ success: false, error: "Password lama yang Anda masukkan salah." }, { status: 400 });
    }

    // 4. Hash Password Baru (Agar aman di database)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 5. Update Password di Database
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ success: true, message: "Password berhasil diubah" });

  } catch (error) {
    console.error("Change Password Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}