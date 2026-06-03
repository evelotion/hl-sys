// hl-sys/src/app/api/tickets/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';

// Fungsi bantuan untuk nambah hari ke tanggal
function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> } // <-- Tipe params diubah jadi Promise
) {
  try {
    const body = await request.json();
    
    // <-- INI KUNCI FIX-NYA: Unwrap params pakai await
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    // 1. Logika Jika ini hanya update status (Dari tombol PIC Logistik)
    if (body.action === 'UPDATE_STATUS') {
      const updated = await db.ticket.update({
        where: { id: ticketId },
        data: { 
          status: body.status, 
          resolvedAt: body.status === 'DONE' ? new Date() : null 
        }
      });
      return NextResponse.json({ success: true, ticket: updated });
    }

    // 2. Logika Jika ini full Edit tiket dari OPR / ADM
    const { title, description, category, branchName, picId, requestDate, mediaRequest, issueImgUrl } = body;
    
    // Tentukan Base Date baru
    const baseDate = requestDate ? new Date(requestDate) : new Date();
    
    // Hitung ulang SLA Deadline berdasarkan kategori baru
    let deadline = new Date(baseDate);
    if (category === 'P3') {
      deadline = addDays(baseDate, 3);
    } else if (category === 'Pembayaran') {
      deadline = addDays(baseDate, 5);
    } else if (category === 'Pengadaan') {
      deadline = addDays(baseDate, 14);
    } else {
      deadline = addDays(baseDate, 1);
    }

    // Update data di database
    const updatedTicket = await db.ticket.update({
      where: { id: ticketId },
      data: {
        title, 
        description,
        category,
        branchName,
        mediaRequest,
        requestDate: baseDate,
        slaDeadline: deadline,
        issueImgUrl,
        picId: picId || null,
      },
    });

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error) {
    console.error("Error update ticket:", error);
    return NextResponse.json({ error: "Gagal mengupdate tiket" }, { status: 500 });
  }
}