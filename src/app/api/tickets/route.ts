// hl-sys/src/app/api/tickets/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db'; 

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Tambahin requesterName di sini
    const { title, description, category, branchName, requesterName, picId, requestDate, mediaRequest, issueImgUrl } = body;

    const year = new Date().getFullYear();
    const count = await db.ticket.count();
    const ticketNumber = `LOG-${year}-${String(count + 1).padStart(4, '0')}`;

    const baseDate = requestDate ? new Date(requestDate) : new Date();
    
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

    const newTicket = await db.ticket.create({
      data: {
        ticketNumber,
        title, 
        description,
        category,
        branchName,
        requesterName, // <-- Masukin ke payload database
        mediaRequest,
        requestDate: baseDate,
        slaDeadline: deadline, 
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