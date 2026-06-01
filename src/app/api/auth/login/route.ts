// hl-sys/src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../lib/db';

export async function POST(request: Request) {
  try {
    const { initial, password } = await request.json();
    
    // 1. Cek validasi default password
    if (password !== 'password123') {
      return NextResponse.json({ error: 'Password salah! Gunakan password default.' }, { status: 401 });
    }

    let user;
    const upperInitial = initial.toUpperCase();
    
    // 2. Logika bypass berdasarkan Inisial
    if (upperInitial === 'OPR') {
      user = await db.user.findFirst({ where: { role: 'OPERATOR' } });
      if (!user) user = await db.user.create({ data: { name: 'Ajeng Endah', role: 'OPERATOR' } });
    } else if (upperInitial === 'IND') {
      // Akses khusus lo sebagai Developer
      user = await db.user.findFirst({ where: { name: 'Indra Dwi Ananda' } });
      if (!user) user = await db.user.create({ data: { name: 'Indra Dwi Ananda', role: 'OPERATOR' } });
    } else if (upperInitial === 'IBL') {
      user = await db.user.findFirst({ where: { name: { contains: 'Ikbal', mode: 'insensitive' } } });
    } else if (upperInitial === 'NOV') {
      user = await db.user.findFirst({ where: { name: { contains: 'Novianti', mode: 'insensitive' } } });
    } else if (upperInitial === 'MLK') {
      user = await db.user.findFirst({ where: { name: { contains: 'Malik', mode: 'insensitive' } } });
    }

    if (!user) {
      return NextResponse.json({ error: 'Inisial tidak ditemukan di sistem!' }, { status: 401 });
    }

    // 3. Pasang session ke Cookie
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