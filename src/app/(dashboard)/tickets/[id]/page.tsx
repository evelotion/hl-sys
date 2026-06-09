// src/app/(dashboard)/tickets/[id]/page.tsx
import React from 'react';
import { db } from '@/src/lib/db'; 
import TaskViewClient from './TaskViewClient';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers'; 

export default async function TaskViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const ticket = await db.ticket.findUnique({
    where: { id: id },
    include: { 
      pic: true,
      logs: {          
        include: { user: true }, 
        orderBy: { createdAt: 'asc' } 
      }
    }
  });

  if (!ticket) {
    notFound();
  }

  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    select: { id: true, name: true, initial: true },
    orderBy: { name: 'asc' }
  });

  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('user_session')?.value;
  const sessionUser = sessionStr ? JSON.parse(sessionStr) : null;
  
  // TAHAP 3: Ambil data user utuh dari DB biar dapet "initial"-nya
  let currentUser = sessionUser;
  if (sessionUser?.id) {
    const dbUser = await db.user.findUnique({ where: { id: sessionUser.id } });
    if (dbUser) currentUser = dbUser;
  }

  return (
    <TaskViewClient 
      initialTicket={ticket} 
      pics={pics} 
      currentUser={currentUser} 
    />
  );
}