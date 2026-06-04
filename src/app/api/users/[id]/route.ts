// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db'; // Sesuaikan jumlah '../' jika path db lo beda

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    
    // Wajib di-await dulu params-nya di Next.js versi baru
    const resolvedParams = await params;
    
    const updatedUser = await db.user.update({ 
      where: { id: resolvedParams.id }, 
      data: body 
    });
    
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Wajib di-await dulu params-nya di Next.js versi baru
    const resolvedParams = await params;

    await db.user.delete({ where: { id: resolvedParams.id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal delete user' }, { status: 500 });
  }
}