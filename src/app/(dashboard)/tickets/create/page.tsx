// hl-sys/src/app/(dashboard)/tickets/create/page.tsx
import React from 'react';
import { db } from '../../../../lib/db'; // sesuaikan path import db lo kalau error
import CreateTicketClient from './CreateTicketClient';

export const dynamic = 'force-dynamic';

export default async function CreateTicketPage() {
  // Ambil data PIC beserta Inisial & NOMOR HP buat keperluan WhatsApp
  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    select: { id: true, name: true, initial: true, phone: true }, // <-- Ditambahin phone: true
    orderBy: { name: 'asc' }
  });

  return <CreateTicketClient pics={pics} />;
}