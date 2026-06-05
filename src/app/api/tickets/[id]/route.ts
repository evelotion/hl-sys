// hl-sys/src/app/api/tickets/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;
    const userId = body.userId; 

    // 1. UPDATE STATUS
    if (body.action === 'UPDATE_STATUS') {
      const updated = await db.ticket.update({
        where: { id: ticketId },
        data: { status: body.status, resolvedAt: body.status === 'DONE' ? new Date() : null }
      });
      if (userId) {
        await db.activityLog.create({
          data: { ticketId, userId, action: 'SYSTEM', message: `Mengubah status menjadi ${body.status.replace('_', ' ')}` }
        });
      }
      return NextResponse.json({ success: true, ticket: updated });
    }

    // 2. TAMBAH KOMENTAR MANUAL
    if (body.action === 'ADD_COMMENT') {
      await db.activityLog.create({
        data: { ticketId, userId, action: 'COMMENT', message: body.message }
      });
      return NextResponse.json({ success: true });
    }

    // 3. FULL EDIT DARI ADM
    const { title, description, category, branchName, picId, requestDate, mediaRequest, issueImgUrl } = body;
    
    // AMBIL TIKET LAMA (Termasuk data PIC lama)
    const oldTicket = await db.ticket.findUnique({ 
      where: { id: ticketId },
      include: { pic: true } 
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
      include: { pic: true } // <-- Tambahan agar response balikan bawa data PIC baru
    });

    // CATAT LOG OTOMATIS
    if (userId) {
      if (oldTicket?.category !== category) {
        await db.activityLog.create({
          data: { ticketId, userId, action: 'SYSTEM', message: `Mengubah Kategori dari ${oldTicket?.category} menjadi ${category}` }
        });
      }

      // IMPROVE POIN 2: REKAM JEJAK RE-ASSIGNMENT
      if (oldTicket?.picId !== picId) {
        const oldPicName = oldTicket?.pic?.name || 'Belum di-assign';
        const newPicName = updatedTicket.pic?.name || 'Belum di-assign';
        await db.activityLog.create({
          data: { ticketId, userId, action: 'SYSTEM', message: `Re-assign PIC dari ${oldPicName} menjadi ${newPicName}` }
        });
      }
    }

    // Return flag isReassigned agar Frontend tahu kapan harus nembak notifikasi
    return NextResponse.json({ 
      success: true, 
      ticket: updatedTicket, 
      isReassigned: oldTicket?.picId !== picId 
    });
  } catch (error) {
    console.error("Error update ticket:", error);
    return NextResponse.json({ error: "Gagal mengupdate tiket" }, { status: 500 });
  }
}

// IMPROVE POIN 6: FUNGSI HAPUS TIKET SECARA PERMANEN
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;
    
    // Hapus Log Aktivitasnya dulu biar relasinya gak error
    await db.activityLog.deleteMany({ where: { ticketId } });
    
    // Baru hapus Tiketnya
    await db.ticket.delete({ where: { id: ticketId } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error delete ticket:", error);
    return NextResponse.json({ error: "Gagal menghapus tiket" }, { status: 500 });
  }
}