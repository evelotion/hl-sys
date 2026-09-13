import { NextResponse } from 'next/server';
// 1. Hapus import PrismaClient dan ganti pakai import 'db' dari lib lo
import { db } from '@/src/lib/db';
import { requirePermission, authErrorResponse } from '@/src/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { proofUrl } = body;

    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    if (!proofUrl) {
      return NextResponse.json(
        { error: 'URL Bukti kerja wajib dikirim, Bro!' },
        { status: 400 }
      );
    }

    const existingTicket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { picId: true, category: true, pic: { select: { team: true } } },
    });
    if (!existingTicket) {
      return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
    }
    await requirePermission('ticket:status', { picId: existingTicket.picId, category: existingTicket.category, picTeam: existingTicket.pic?.team });

    // 2. Ganti kata 'prisma' jadi 'db'
    const updatedTicket = await db.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'DONE',
        proofImgUrl: proofUrl,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Tiket berhasil ditutup!',
      ticket: updatedTicket
    });

  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Error saat update tiket:', error);
    return NextResponse.json(
      { error: 'Gagal update status tiket ke database' },
      { status: 500 }
    );
  }
}
