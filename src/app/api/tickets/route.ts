import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category, branchName, picId } = body;

    // Bikin nomor tiket otomatis (Contoh: LOG-2026-0004)
    const year = new Date().getFullYear();
    const count = await db.ticket.count();
    const ticketNumber = `LOG-${year}-${String(count + 1).padStart(4, '0')}`;

    const newTicket = await db.ticket.create({
      data: {
        ticketNumber,
        title,
        description,
        category,
        branchName,
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