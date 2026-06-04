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
  
  const whereBase = isPic ? { picId: user.id } : {};

  const totalRequest = await db.ticket.count({ where: whereBase });
  const onProgress = await db.ticket.count({
    where: { ...whereBase, status: { in: ['OPEN', 'IN_PROGRESS'] } }
  });
  const completed = await db.ticket.count({
    where: { ...whereBase, status: 'DONE' }
  });

  const completedTickets = await db.ticket.findMany({
    where: { ...whereBase, status: 'DONE' },
    select: { createdAt: true, resolvedAt: true, slaDeadline: true }
  });

  let slaOnTimePercentage = 100;
  if (completedTickets.length > 0) {
    const onTimeTickets = completedTickets.filter(t => {
      if (!t.resolvedAt || !t.slaDeadline) return false;
      return t.resolvedAt.getTime() <= t.slaDeadline.getTime(); 
    }).length;
    slaOnTimePercentage = Math.round((onTimeTickets / completedTickets.length) * 100);
  } else if (totalRequest > 0 && completed === 0) {
    slaOnTimePercentage = 0; 
  }

  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    include: { tasks: true }
  });

  const picWorkload = pics.map((pic: any) => {
    const activeTasks = pic.tasks.filter((t: any) => t.status !== 'DONE').length;
    const completedTasks = pic.tasks.filter((t: any) => t.status === 'DONE').length;
    return { name: pic.name, activeTasks, completed: completedTasks };
  });

  const recentData = await db.ticket.findMany({
    where: whereBase,
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { pic: true }
  });

  const recentTickets = recentData.map((t: any) => {
    let progress = 25; 
    if (t.status === 'IN_PROGRESS') progress = 65;
    if (t.status === 'DONE') progress = 100;

    let sla = 0;
    if (t.slaDeadline && t.createdAt) {
       const totalSlaTime = new Date(t.slaDeadline).getTime() - new Date(t.createdAt).getTime();
       const endTime = t.resolvedAt ? new Date(t.resolvedAt).getTime() : new Date().getTime();
       const timeElapsed = endTime - new Date(t.createdAt).getTime();
       
       if (totalSlaTime > 0) {
         sla = Math.round((timeElapsed / totalSlaTime) * 100);
       }
       if (sla > 100) sla = 100; 
       if (sla < 0) sla = 0;
    }

    let displayStatus = 'REQUEST';
    if (t.status === 'IN_PROGRESS') displayStatus = 'ON PROGRESS';
    if (t.status === 'DONE') displayStatus = 'COMPLETED';

    return {
      id: t.ticketNumber,
      status: displayStatus,
      progress: progress,
      sla: sla,
      pic: t.pic?.initial || 'N/A',
      // --- DATA TAMBAHAN BUAT UI LATEST TICKET ---
      title: t.title,
      category: t.category,
      cabang: t.branchName,
      date: new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    };
  });

  return (
    <DashboardClient 
      totalRequest={totalRequest}
      onProgress={onProgress}
      completed={completed}
      slaOnTime={slaOnTimePercentage}
      picWorkload={picWorkload}
      userRole={user.role} 
      userName={user.name}
      recentTickets={recentTickets}
    />
  );
}