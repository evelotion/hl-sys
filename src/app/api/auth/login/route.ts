// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userInitial = body.initial || body.nip || '';
    const password = body.password;
    
    if (password !== 'password123') {
      return NextResponse.json({ error: 'Password salah! Gunakan password default.' }, { status: 401 });
    }

    if (!userInitial) {
      return NextResponse.json({ error: 'Inisial tidak boleh kosong!' }, { status: 400 });
    }

    const upperInitial = userInitial.toUpperCase();
    
    // Langsung cari user berdasarkan kolom 'initial' di database
    const user = await db.user.findUnique({ 
      where: { initial: upperInitial } 
    });

    if (!user) {
      return NextResponse.json({ error: 'Inisial tidak ditemukan di sistem!' }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set('user_session', JSON.stringify({ id: user.id, name: user.name, role: user.role }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 hari
      path: '/'
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}