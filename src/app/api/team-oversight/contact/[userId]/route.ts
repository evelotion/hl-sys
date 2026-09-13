// src/app/api/team-oversight/contact/[userId]/route.ts
// Endpoint kecil khusus tombol "Ingatkan via Teams" di section pengawasan tim (Fase 5).
// getTeamBacklog() sengaja TIDAK menarik email (lihat src/lib/teamOversight.ts) supaya email
// tidak ikut payload dashboard/backlog untuk siapa pun. Endpoint ini mengambil email SATU
// anggota tim, on-demand saat tombol diklik, dan hanya untuk anggota yang memang berada dalam
// lingkup pemanggil (teamMemberWhereClause -- sama definisi "anggota tim" dengan getTeamBacklog).
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { requirePermission, authErrorResponse } from '@/src/lib/auth';
import { teamMemberWhereClause } from '@/src/lib/teamOversight';

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await requirePermission('team:oversee');
    const { userId } = await params;

    const member = await db.user.findFirst({
      where: { id: userId, ...teamMemberWhereClause(user) },
      select: { email: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'User tidak ditemukan dalam lingkup tim Anda' }, { status: 404 });
    }

    return NextResponse.json({ success: true, email: member.email });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: 'Gagal mengambil kontak' }, { status: 500 });
  }
}
