// src/app/api/users/[id]/reset-password/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/src/lib/db';
import { requirePermission, authErrorResponse } from '@/src/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await requirePermission('user:manage');
    const resolvedParams = await params;
    const targetId = resolvedParams.id;
    const { newPassword } = await req.json();

    if (targetId === sessionUser.id) {
      return NextResponse.json({ error: 'Tidak bisa reset password akun sendiri lewat sini. Gunakan Ganti Password.' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password baru minimal 8 karakter.' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id: targetId }, select: { id: true, initial: true, role: true } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (targetUser.role === 'OPERATOR' && sessionUser.role !== 'OPERATOR') {
      return NextResponse.json({ error: 'Hanya sesama Operator yang boleh mereset password Operator.' }, { status: 403 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.user.update({ where: { id: targetId }, data: { password: hashed, sessionsValidFrom: new Date() } });

    // TODO(fase-lanjutan): idealnya dicatat ke tabel activity log tersendiri untuk
    // aktivitas user (bukan tiket), bukan cuma console.log. BELUM dikerjakan atas
    // permintaan Indra: skema ActivityLog saat ini mewajibkan ticketId (tidak ada
    // jalur untuk aktivitas non-tiket). Perlu tabel log terpisah, bukan membuat
    // ticketId nullable. Untuk sekarang cukup dicatat ke server log.
    console.log(`[user:manage] ${sessionUser.initial} mereset password user ${targetUser.initial} pada ${new Date().toISOString()}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Reset Password Error:', error);
    return NextResponse.json({ error: 'Gagal mereset password' }, { status: 500 });
  }
}
