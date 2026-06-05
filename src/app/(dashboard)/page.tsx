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

  // 1. KPI Metrik
  const totalRequest = await db.ticket.count({ where: whereBase });
  const requestCount = await db.ticket.count({ where: { ...whereBase, status: 'OPEN' } });
  const onProgress = await db.ticket.count({ where: { ...whereBase, status: 'IN_PROGRESS' } });
  const completed = await db.ticket.count({ where: { ...whereBase, status: 'DONE' } });

  // 2. SLA Tracking (IMPROVE POIN 8: Berdasarkan Total Request)
  const allTicketsForSLA = await db.ticket.findMany({
    where: whereBase,
    select: { createdAt: true, resolvedAt: true, slaDeadline: true, status: true }
  });

  let slaOnTimePercentage = 100;
  if (totalRequest > 0) {
    const now = new Date();
    let overdueCount = 0;
    
    allTicketsForSLA.forEach(t => {
      if (t.slaDeadline) {
        // Jika sudah selesai, cek apakah selesainya telat
        if (t.status === 'DONE' && t.resolvedAt && t.resolvedAt > t.slaDeadline) {
          overdueCount++;
        } 
        // Jika belum selesai, cek apakah hari ini sudah melebihi deadline
        else if (t.status !== 'DONE' && now > t.slaDeadline) {
          overdueCount++;
        }
      }
    });

    const onTimeCount = totalRequest - overdueCount;
    slaOnTimePercentage = Math.round((onTimeCount / totalRequest) * 100);
  } else {
    slaOnTimePercentage = 0;
  }

  // 3. Beban Kerja PIC (IMPROVE POIN 7: Susun Berdasarkan Kategori)
  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    include: { tasks: true }
  });

  const p3Initials = ['FER', 'MAU', 'ASM', 'MLK', 'NOV', 'IND', 'SML', 'IBL'];
  const pembayaranInitials = ['RIN', 'ETK', 'RKS', 'RLY'];
  const pengadaanInitials = ['GES', 'RAP', 'YNS', 'AND', 'IDH', 'RML', 'HEN', 'MWS'];

  const picWorkload = {
    P3: [] as any[],
    Pengadaan: [] as any[],
    Pembayaran: [] as any[],
    Lainnya: [] as any[]
  };

  pics.forEach((pic: any) => {
    const activeTasks = pic.tasks.filter((t: any) => t.status !== 'DONE').length;
    const completedTasks = pic.tasks.filter((t: any) => t.status === 'DONE').length;
    const picData = { name: pic.name, initial: pic.initial, activeTasks, completed: completedTasks };
    
    if (p3Initials.includes(pic.initial)) picWorkload.P3.push(picData);
    else if (pengadaanInitials.includes(pic.initial)) picWorkload.Pengadaan.push(picData);
    else if (pembayaranInitials.includes(pic.initial)) picWorkload.Pembayaran.push(picData);
    else picWorkload.Lainnya.push(picData);
  });

  const formatTicketData = (t: any) => {
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

    return {
      id: t.ticketNumber,
      status: t.status === 'IN_PROGRESS' ? 'ON PROGRESS' : (t.status === 'DONE' ? 'COMPLETED' : 'REQUEST'),
      progress: progress,
      sla: sla,
      pic: t.pic?.initial || 'N/A',
      title: t.title,
      category: t.category,
      cabang: t.branchName,
      date: new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    };
  };

  const urgentDataRes = await db.ticket.findFirst({
    where: { ...whereBase, status: { not: 'DONE' }, slaDeadline: { not: null } },
    orderBy: { slaDeadline: 'asc' },
    include: { pic: true }
  });
  const urgentTicket = urgentDataRes ? formatTicketData(urgentDataRes) : null;

  const recentData = await db.ticket.findMany({
    where: whereBase,
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { pic: true }
  });
  const recentTickets = recentData.map(formatTicketData);

  return (
    <DashboardClient 
      totalRequest={totalRequest}
      requestCount={requestCount}
      onProgress={onProgress}
      completed={completed}
      slaOnTime={slaOnTimePercentage}
      picWorkload={picWorkload}
      userRole={user.role} 
      userName={user.name}
      recentTickets={recentTickets}
      urgentTicket={urgentTicket} 
    />
  );
}