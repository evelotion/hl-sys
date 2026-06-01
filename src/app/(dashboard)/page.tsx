// hl-sys/src/app/(dashboard)/page.tsx
import React from 'react';
import { db } from '../../lib/db'; 
import DashboardClient from './DashboardClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('user_session')?.value;
  
  if (!sessionStr) redirect('/login');
  
  const user = JSON.parse(sessionStr);
  const isPic = user.role === 'PIC_LOGISTIK';
  
  // Filter query: Kalau PIC, cuma cari data yang picId-nya cocok dengan id dia
  const whereBase = isPic ? { picId: user.id } : {};

  // 1. Hitung metrik sesuai filter
  const totalRequest = await db.ticket.count({ where: whereBase });
  const onProgress = await db.ticket.count({
    where: { ...whereBase, status: { in: ['OPEN', 'IN_PROGRESS'] } }
  });
  const completed = await db.ticket.count({
    where: { ...whereBase, status: 'DONE' }
  });

  // 2. Kalkulasi SLA On Time
  const completedTickets = await db.ticket.findMany({
    where: { ...whereBase, status: 'DONE' },
    select: { createdAt: true, resolvedAt: true }
  });

  let slaOnTimePercentage = 100;
  if (completedTickets.length > 0) {
    const onTimeTickets = completedTickets.filter(t => {
      if (!t.resolvedAt) return false;
      const diffInHours = (t.resolvedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
      return diffInHours <= 24; 
    }).length;
    slaOnTimePercentage = Math.round((onTimeTickets / completedTickets.length) * 100);
  } else if (totalRequest > 0 && completed === 0) {
    slaOnTimePercentage = 0; 
  }

  // 3. Tarik data user khusus PIC Logistik (Buat workload)
  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    include: { tasks: true }
  });

  const picWorkload = pics.map((pic: any) => {
    const activeTasks = pic.tasks.filter((t: any) => t.status !== 'DONE').length;
    const completedTasks = pic.tasks.filter((t: any) => t.status === 'DONE').length;
    return { name: pic.name, activeTasks, completed: completedTasks };
  });

  return (
    <DashboardClient 
      totalRequest={totalRequest}
      onProgress={onProgress}
      completed={completed}
      slaOnTime={slaOnTimePercentage}
      picWorkload={picWorkload}
      userRole={user.role} // Kirim role ke Client Component
    />
  );
}