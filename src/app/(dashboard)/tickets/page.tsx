// hl-sys/src/app/(dashboard)/tickets/page.tsx
import React from 'react';
import { db } from '../../../lib/db'; 
import TicketClient from './TicketClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('user_session')?.value;
  
  if (!sessionStr) redirect('/login');
  
  const user = JSON.parse(sessionStr);
  
  // Filter hanya tiket milik PIC bersangkutan (jika dia PIC)
  const whereClause = user.role === 'PIC_LOGISTIK' ? { picId: user.id } : {};

  const ticketsData = await db.ticket.findMany({
    where: whereClause,
    include: {
      pic: true, 
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedTickets = ticketsData.map((t: any) => ({
    originalId: t.id,
    ticketNumber: t.ticketNumber, 
    category: t.category,         
    title: t.title,
    cabang: t.branchName,         
    pic: t.pic?.name || 'Belum di-assign',
    status: t.status,
    timestamp: new Date(t.createdAt).getTime(), 
    date: new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    
    priority: t.priority // <-- TAMBAHIN BARIS INI BRO
  }));

  return <TicketClient initialTickets={formattedTickets} userRole={user.role} />;
}