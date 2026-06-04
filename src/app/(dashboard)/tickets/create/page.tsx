// src/app/(dashboard)/tickets/create/page.tsx
import React from 'react';
import { db } from '../../../../lib/db'; 
import CreateTicketClient from './CreateTicketClient';

export const dynamic = 'force-dynamic';

export default async function CreateTicketPage() {
  // Ambil data PIC beserta Inisial, NOMOR HP, dan EMAIL
  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    select: { 
      id: true, 
      name: true, 
      initial: true, 
      phone: true, 
      email: true 
    }, 
    orderBy: { name: 'asc' }
  });

  // Lempar variabel pics ke dalam kurung kurawal, bukan tanda kutip
  return <CreateTicketClient pics={pics} />;
}