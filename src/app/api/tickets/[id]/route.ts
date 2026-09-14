// hl-sys/src/app/api/tickets/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { requirePermission, authErrorResponse } from '@/src/lib/auth';
import { toTicketDTO, getTicketDtoPerms } from '@/src/lib/ticketDto';

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Bentuk response ticket balikan PATCH -- SAMA PERSIS dengan select yang dipakai
// src/app/(dashboard)/tickets/[id]/page.tsx (minus `logs`, yang tidak relevan untuk
// respons edit tunggal), supaya `setTicket({ ...ticket, ...data.ticket })` di
// TaskViewClient.tsx tidak menghasilkan objek campuran yang field-nya hilang sebagian.
// `pic` SENGAJA select eksplisit (bukan `include: { pic: true }`) -- jangan pernah
// mengembalikan baris User mentah ke client, itu membawa `password` (hash bcrypt) dan
// `sessionsValidFrom`. Kunci keamanannya ada di toTicketDTO di bawah (menghapus SLA/
// kontak sesuai permission), bukan di sempit/lebarnya select ini.
const TICKET_RESPONSE_SELECT = {
  id: true, ticketNumber: true, title: true, description: true, category: true, status: true,
  issueImgUrl: true, proofImgUrl: true, branchName: true, requesterName: true, requesterEmail: true,
  mediaRequest: true, requestDate: true, slaDeadline: true, picId: true, createdAt: true, resolvedAt: true, priority: true,
  pic: { select: { id: true, name: true, initial: true, team: true, phone: true, email: true } },
} as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const existingTicket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { picId: true, category: true, pic: { select: { team: true } } },
    });
    if (!existingTicket) {
      return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
    }
    const ticketCtx = { picId: existingTicket.picId, category: existingTicket.category, picTeam: existingTicket.pic?.team };

    // 1. UPDATE STATUS
    if (body.action === 'UPDATE_STATUS') {
      const sessionUser = await requirePermission('ticket:status', ticketCtx);
      const updated = await db.ticket.update({
        where: { id: ticketId },
        data: { status: body.status, resolvedAt: body.status === 'DONE' ? new Date() : null },
        select: TICKET_RESPONSE_SELECT,
      });
      await db.activityLog.create({
        data: { ticketId, userId: sessionUser.id, action: 'SYSTEM', message: `Mengubah status menjadi ${body.status.replace('_', ' ')}` }
      });
      return NextResponse.json({ success: true, ticket: toTicketDTO(updated, getTicketDtoPerms(sessionUser)) });
    }

    // 2. TAMBAH KOMENTAR MANUAL
    if (body.action === 'ADD_COMMENT') {
      const sessionUser = await requirePermission('ticket:comment', ticketCtx);
      await db.activityLog.create({
        data: { ticketId, userId: sessionUser.id, action: 'COMMENT', message: body.message }
      });
      return NextResponse.json({ success: true });
    }

    // 3. FULL EDIT DARI ADM
    const sessionUser = await requirePermission('ticket:edit', ticketCtx);
    const { title, description, category, branchName, picId, requestDate, mediaRequest, issueImgUrl } = body;

    // AMBIL TIKET LAMA (Termasuk data PIC lama)
    const oldTicket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { category: true, picId: true, pic: { select: { name: true } } }
    });

    const baseDate = requestDate ? new Date(requestDate) : new Date();
    let deadline = new Date(baseDate);
    if (category === 'P3') deadline = addDays(baseDate, 3);
    else if (category === 'Pembayaran') deadline = addDays(baseDate, 5);
    else if (category === 'Pengadaan') deadline = addDays(baseDate, 14);
    else deadline = addDays(baseDate, 1);

    // UPDATE TIKET & AMBIL NAMA PIC BARU
    const updatedTicket = await db.ticket.update({
      where: { id: ticketId },
      data: { title, description, category, branchName, mediaRequest, requestDate: baseDate, slaDeadline: deadline, issueImgUrl, picId: picId || null },
      select: TICKET_RESPONSE_SELECT,
    });

    // CATAT LOG OTOMATIS
    if (oldTicket?.category !== category) {
      await db.activityLog.create({
        data: { ticketId, userId: sessionUser.id, action: 'SYSTEM', message: `Mengubah Kategori dari ${oldTicket?.category} menjadi ${category}` }
      });
    }

    // IMPROVE POIN 2: REKAM JEJAK RE-ASSIGNMENT
    if (oldTicket?.picId !== picId) {
      const oldPicName = oldTicket?.pic?.name || 'Belum di-assign';
      const newPicName = updatedTicket.pic?.name || 'Belum di-assign';
      await db.activityLog.create({
        data: { ticketId, userId: sessionUser.id, action: 'SYSTEM', message: `Re-assign PIC dari ${oldPicName} menjadi ${newPicName}` }
      });
    }

    // Return flag isReassigned agar Frontend tahu kapan harus nembak notifikasi
    return NextResponse.json({
      success: true,
      ticket: toTicketDTO(updatedTicket, getTicketDtoPerms(sessionUser)),
      isReassigned: oldTicket?.picId !== picId
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Error update ticket:", error);
    return NextResponse.json({ error: "Gagal mengupdate tiket" }, { status: 500 });
  }
}

// IMPROVE POIN 6: FUNGSI HAPUS TIKET SECARA PERMANEN
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const existingTicket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { picId: true, category: true, pic: { select: { team: true } } },
    });
    if (!existingTicket) {
      return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
    }
    await requirePermission('ticket:delete', { picId: existingTicket.picId, category: existingTicket.category, picTeam: existingTicket.pic?.team });

    // Hapus Log Aktivitasnya dulu biar relasinya gak error
    await db.activityLog.deleteMany({ where: { ticketId } });

    // Baru hapus Tiketnya
    await db.ticket.delete({ where: { id: ticketId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Error delete ticket:", error);
    return NextResponse.json({ error: "Gagal menghapus tiket" }, { status: 500 });
  }
}
