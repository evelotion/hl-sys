// hl-sys/src/app/api/tickets/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { addBusinessDays } from '@/src/lib/businessDays'; // <-- IMPORT HELPER HARI KERJA
import { requirePermission, authErrorResponse } from '@/src/lib/auth';

export async function POST(request: Request) {
  try {
    await requirePermission('ticket:create');
    const body = await request.json();

    // 1. TAMBAH requesterEmail & priority di destructuring
    const { 
      title, description, category, priority, branchName, 
      requesterName, requesterEmail, picId, requestDate, 
      mediaRequest, issueImgUrl 
    } = body;
    
    const year = new Date().getFullYear();
    
    // --- FIX LOGIKA NOMOR TIKET BIAR GAK ERROR PAS ADA TIKET DIHAPUS ---
    // Cari tiket paling terakhir berdasarkan tanggal pembuatan
    const lastTicket = await db.ticket.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    let nextSequence = 1;
    
    // Kalau udah ada tiket sebelumnya di tahun yang sama, ekstrak angkanya
    if (lastTicket && lastTicket.ticketNumber.includes(`LOG-${year}-`)) {
      const lastSequence = parseInt(lastTicket.ticketNumber.split('-')[2], 10);
      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }
    
    const ticketNumber = `LOG-${year}-${String(nextSequence).padStart(4, '0')}`;
    // -------------------------------------------------------------------
    
    const baseDate = requestDate ? new Date(requestDate) : new Date();
    
    // 2. LOGIKA SLA BERDASARKAN PRIORITAS (MENGGUNAKAN HARI KERJA)
    let slaDays = 3; // Default MEDIUM = 3 Hari Kerja
    if (priority === 'URGENT') {
      slaDays = 1;
    } else if (priority === 'LOW') {
      slaDays = 7;
    }

    // Hitung deadline pakai fungsi penambah hari kerja (skip Sabtu-Minggu)
    const deadline = addBusinessDays(baseDate, slaDays);

    const newTicket = await db.ticket.create({
      data: {
        ticketNumber,
        title,
        description,
        category,
        priority: priority || 'MEDIUM', // <-- Simpan prioritas ke database
        branchName,
        requesterName, 
        requesterEmail, // <-- Simpan email pemohon
        mediaRequest,
        requestDate: baseDate,
        slaDeadline: deadline, // <-- Masukkan deadline hari kerja
        issueImgUrl,
        picId: picId || null,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Error create ticket:", error);
    return NextResponse.json({ error: "Gagal membuat tiket" }, { status: 500 });
  }
}