import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newUser = await db.user.create({ data: body });
    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal membuat user' }, { status: 500 });
  }
}