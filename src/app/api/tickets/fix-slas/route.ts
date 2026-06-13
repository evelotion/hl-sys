// src/app/api/tickets/fix-slas/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { addBusinessDays } from '@/src/lib/businessDays';

export async function GET() {
  try {
    // 1. Ambil semua tiket aktif yang statusnya BELUM selesai ('OPEN' atau 'IN_PROGRESS')
    const activeTickets = await db.ticket.findMany({
      where: {
        status: { not: 'DONE' }
      }
    });

    let updatedCount = 0;

    // 2. Lakukan perulangan untuk menghitung ulang SLA Deadline berdasarkan Hari Kerja
    for (const ticket of activeTickets) {
      let slaDays = 3; // Default Medium
      if (ticket.priority === 'URGENT') slaDays = 1;
      if (ticket.priority === 'LOW') slaDays = 7;

      // Hitung ulang deadline menggunakan logika hari kerja baru dari tanggal dibuat asli (createdAt)
      const newDeadline = addBusinessDays(new Date(ticket.createdAt), slaDays);

      // Update data di database
      await db.ticket.update({
        where: { id: ticket.id },
        data: { slaDeadline: newDeadline }
      });

      updatedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil memperbarui ${updatedCount} tiket aktif ke SLA Hari Kerja.` 
    });
  } catch (error) {
    console.error("Gagal menjalankan fix script:", error);
    return NextResponse.json({ error: "Terjadi kesalahan sistem" }, { status: 500 });
  }
}