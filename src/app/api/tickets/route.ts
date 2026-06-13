// hl-sys/src/app/api/tickets/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { addBusinessDays } from '@/src/lib/businessDays'; // <-- IMPORT HELPER HARI KERJA

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. TAMBAH requesterEmail & priority di destructuring
    const { 
      title, description, category, priority, branchName, 
      requesterName, requesterEmail, picId, requestDate, 
      mediaRequest, issueImgUrl 
    } = body;
    
    const year = new Date().getFullYear();
    const count = await db.ticket.count();
    const ticketNumber = `LOG-${year}-${String(count + 1).padStart(4, '0')}`;
    
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
    console.error("Error create ticket:", error);
    return NextResponse.json({ error: "Gagal membuat tiket" }, { status: 500 });
  }
}