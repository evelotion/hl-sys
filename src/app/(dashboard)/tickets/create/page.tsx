// hl-sys/src/app/(dashboard)/tickets/create/page.tsx
import React from 'react';
import { db } from '../../../../lib/db';
import CreateTicketClient from './CreateTicketClient';

export const dynamic = 'force-dynamic';

export default async function CreateTicketPage() {
  // Ambil data PIC beserta Inisialnya buat filter dinamis di form
  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    select: { id: true, name: true, initial: true },
    orderBy: { name: 'asc' }
  });

  return <CreateTicketClient pics={pics} />;
}