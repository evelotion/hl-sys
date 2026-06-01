// hl-sys/src/app/(dashboard)/tickets/[id]/page.tsx
import React from 'react';
import { db } from '../../../../lib/db'; 
import TaskViewClient from './TaskViewClient';
import { notFound } from 'next/navigation';

export default async function TaskViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id: id },
    include: {
      pic: true, // <-- cabang: true sudah dihapus
    }
  });

  if (!ticket) {
    notFound();
  }

  const formattedTicket = {
    id: ticket.id,
    displayId: ticket.ticketNumber, 
    category: ticket.category,      
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    branchName: ticket.branchName, // <-- Sesuai schema baru
    picName: ticket.pic?.name || 'Belum ditugaskan',
    createdAt: new Date(ticket.createdAt).toLocaleDateString('id-ID', { 
       day: 'numeric', 
       month: 'long', 
       year: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
     })
  };

  return <TaskViewClient ticket={formattedTicket} />;
}