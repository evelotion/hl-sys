// hl-sys/src/app/(dashboard)/tickets/[id]/page.tsx
import React from 'react';
import { db } from '@/src/lib/db'; // <-- Pakai alias biar anti-error
import TaskViewClient from './TaskViewClient';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers'; // <-- Tambahan untuk ambil session

export default async function TaskViewPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // 1. Ambil data tiket beserta relasi PIC-nya
  const ticket = await db.ticket.findUnique({
    where: { id: id },
    include: { 
      pic: true,
      logs: {          // <-- Tambahan buat narik data history
        include: { user: true }, 
        orderBy: { createdAt: 'asc' } 
      }
    }
  });

  if (!ticket) {
    notFound();
  }

  // 2. Ambil list PIC buat keperluan dropdown di Modal Edit
  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    select: { id: true, name: true, initial: true },
    orderBy: { name: 'asc' }
  });

  // 3. Ambil sesi user yang login untuk nentuin akses tombol Edit
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('user_session')?.value;
  const currentUser = sessionStr ? JSON.parse(sessionStr) : null;

  // 4. Passing SEMUA data utuh ke Client Component
  // Nggak perlu diformat manual, biarin objek aslinya masuk supaya form Edit bisa jalan normal.
  return (
    <TaskViewClient 
      initialTicket={ticket} 
      pics={pics} 
      currentUser={currentUser} 
    />
  );
}