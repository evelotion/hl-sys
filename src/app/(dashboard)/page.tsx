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

  // 2. SLA Tracking
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
        if (t.status === 'DONE' && t.resolvedAt && t.resolvedAt > t.slaDeadline) {
          overdueCount++;
        } else if (t.status !== 'DONE' && now > t.slaDeadline) {
          overdueCount++;
        }
      }
    });

    const onTimeCount = totalRequest - overdueCount;
    slaOnTimePercentage = Math.round((onTimeCount / totalRequest) * 100);
  } else {
    slaOnTimePercentage = 0;
  }

  // 3. Beban Kerja PIC
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
      picName: t.pic?.name || 'PIC',
      picPhone: t.pic?.phone || '',
      picEmail: t.pic?.email || '',
      title: t.title,
      category: t.category,
      priority: t.priority || 'MEDIUM',
      cabang: t.branchName,
      date: new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB'
    };
  };

  const activeSlaTickets = await db.ticket.findMany({
    where: { ...whereBase, status: { not: 'DONE' }, slaDeadline: { not: null } },
    orderBy: { slaDeadline: 'asc' },
    include: { pic: true }
  });

  const formattedActiveSla = activeSlaTickets.map(formatTicketData);
  const urgentTicket = formattedActiveSla.length > 0 ? formattedActiveSla[0] : null;
  const criticalTickets = formattedActiveSla.filter(t => t.sla >= 80);

  // 4. LIVE PROGRESS BOARD (Hanya IN_PROGRESS)
  const recentData = await db.ticket.findMany({
    where: { ...whereBase, status: 'IN_PROGRESS' }, 
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { pic: true }
  });
  const recentTickets = recentData.map(formatTicketData);

  // 5. TIKET MASUK TERBARU (Ambil 10 tiket)
  const latestTicketsData = await db.ticket.findMany({
    where: whereBase,
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { pic: true }
  });
  const latestTickets = latestTicketsData.map(formatTicketData);
  const newestTicket = latestTickets.length > 0 ? latestTickets[0] : null; // <-- TIKET PALING BARU

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
      criticalTickets={criticalTickets} 
      latestTickets={latestTickets} 
      newestTicket={newestTicket} // <-- PASSING TIKET TERBARU
    />
  );
}