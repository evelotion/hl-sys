// hl-sys/src/lib/actions.ts
"use server";

import { db } from './db';
import { revalidatePath } from 'next/cache';
import { requirePermission } from './auth';

export async function selesaikanTiket(ticketId: string, proofImgUrl?: string) {
  try {
    const existingTicket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { picId: true, category: true, pic: { select: { team: true } } },
    });
    if (!existingTicket) {
      return { success: false };
    }
    await requirePermission('ticket:status', { picId: existingTicket.picId, category: existingTicket.category, picTeam: existingTicket.pic?.team });

    await db.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'DONE',
        resolvedAt: new Date(),
        proofImgUrl: proofImgUrl || null, // Simpan link dari Cloudinary
      },
    });
    
    revalidatePath('/tickets');
    revalidatePath('/');
    revalidatePath(`/tickets/${ticketId}`); 
    
    return { success: true };
  } catch (error) {
    console.error("Gagal update tiket:", error);
    return { success: false };
  }
}