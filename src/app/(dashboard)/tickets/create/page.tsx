import React from 'react';
import { db } from '../../../../lib/db';
import CreateTicketClient from './CreateTicketClient';

export const dynamic = 'force-dynamic';

export default async function CreateTicketPage() {
  // Ambil data PIC buat dropdown assign tugas ke Ikbal, dkk.
  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    select: { id: true, name: true }
  });

  return <CreateTicketClient pics={pics} />;
}