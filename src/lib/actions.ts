// hl-sys/src/lib/actions.ts
"use server";

import { db } from './db';
import { revalidatePath } from 'next/cache';

export async function selesaikanTiket(ticketId: string, proofImgUrl?: string) {
  try {
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