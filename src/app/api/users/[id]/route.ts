import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updatedUser = await db.user.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await db.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal delete user' }, { status: 500 });
  }
}