// hl-sys/src/app/(dashboard)/page.tsx
import React from 'react';
import { db } from '@/src/lib/db';
import DashboardClient from './DashboardClient';
import { requireUserForPage } from '@/src/lib/auth';
import { ticketScopeWhere } from '@/src/lib/roles';
import { getBusinessMinutesBetween } from '@/src/lib/businessDays';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUserForPage();

  const whereBase = ticketScopeWhere(user);
  const canManageTickets = user.role === 'OPERATOR' || user.role === 'KEPALA_DEPARTEMEN' || user.role === 'KEPALA_BIDANG';

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

  // 3. Beban Kerja PIC & LOGIKA MILESTONE APRESIASI
  const pics = await db.user.findMany({
    where: { role: 'PIC_LOGISTIK' },
    select: { name: true, initial: true, tasks: { select: { status: true, resolvedAt: true } } }
  });

  const p3Initials = ['FER', 'MAU', 'ASM', 'MLK', 'NOV', 'IND', 'SML', 'IBL', 'SEM'];
  const pembayaranInitials = ['RIN', 'ETK', 'RKS'];
  const pengadaanInitials = ['GES', 'RAP', 'YNS', 'AND', 'IDH', 'RML', 'HEN', 'MWS'];

  const picWorkload = {
    P3: [] as any[],
    Pengadaan: [] as any[],
    Pembayaran: [] as any[],
    Lainnya: [] as any[]
  };

  const todayDateStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const milestones: { name: string, initial: string, count: number }[] = [];

  pics.forEach((pic: any) => {
    const activeTasks = pic.tasks.filter((t: any) => t.status !== 'DONE').length;
    const completedTasks = pic.tasks.filter((t: any) => t.status === 'DONE').length;
    const picData = { name: pic.name, initial: pic.initial, activeTasks, completed: completedTasks };
    
    if (p3Initials.includes(pic.initial)) picWorkload.P3.push(picData);
    else if (pengadaanInitials.includes(pic.initial)) picWorkload.Pengadaan.push(picData);
    else if (pembayaranInitials.includes(pic.initial)) picWorkload.Pembayaran.push(picData);
    else picWorkload.Lainnya.push(picData);

    const doneTasks = pic.tasks
      .filter((t: any) => t.status === 'DONE' && t.resolvedAt)
      .sort((a: any, b: any) => new Date(a.resolvedAt).getTime() - new Date(b.resolvedAt).getTime());

    const count = doneTasks.length;
    
    const checkMilestone = (target: number) => {
      if (count >= target) {
        const targetTask = doneTasks[target - 1]; 
        if (targetTask && targetTask.resolvedAt) {
          const resolveDateStr = new Date(new Date(targetTask.resolvedAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
          if (resolveDateStr === todayDateStr) {
            milestones.push({ name: pic.name, initial: pic.initial, count: target });
            return true;
          }
        }
      }
      return false;
    };

    if (checkMilestone(100)) return;
    if (checkMilestone(50)) return;
    checkMilestone(10);
  });

  const formatTicketData = (t: any) => {
    let progress = 25; 
    if (t.status === 'IN_PROGRESS') progress = 65;
    if (t.status === 'DONE') progress = 100;

    let sla = 0;
    if (t.slaDeadline && t.createdAt) {
       const totalSlaBusinessMinutes = getBusinessMinutesBetween(new Date(t.createdAt), new Date(t.slaDeadline));
       const endTime = t.resolvedAt ? new Date(t.resolvedAt) : new Date();
       const businessMinutesElapsed = getBusinessMinutesBetween(new Date(t.createdAt), endTime);
       
       if (totalSlaBusinessMinutes > 0) {
         sla = Math.round((businessMinutesElapsed / totalSlaBusinessMinutes) * 100);
       }
       if (sla > 100) sla = 100; 
       if (sla < 0) sla = 0;
    }

    return {
      id: t.ticketNumber,
      originalId: t.id, // <-- INI YANG PENTING UNTUK ROUTING KE DETAIL TIKET
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

  const ticketListSelect = {
    id: true, ticketNumber: true, status: true, createdAt: true, resolvedAt: true, slaDeadline: true,
    title: true, category: true, priority: true, branchName: true,
    pic: { select: { initial: true, name: true, phone: true, email: true } },
  } as const;

  const activeSlaTickets = await db.ticket.findMany({
    where: { ...whereBase, status: { not: 'DONE' }, slaDeadline: { not: null } },
    orderBy: { slaDeadline: 'asc' },
    select: ticketListSelect
  });

  const formattedActiveSla = activeSlaTickets.map(formatTicketData);
  const urgentTicket = formattedActiveSla.length > 0 ? formattedActiveSla[0] : null;
  const criticalTickets = formattedActiveSla.filter(t => t.sla >= 80);

  const recentData = await db.ticket.findMany({
    where: { ...whereBase, status: 'IN_PROGRESS' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: ticketListSelect
  });
  const recentTickets = recentData.map(formatTicketData);

  const latestTicketsData = await db.ticket.findMany({
    where: whereBase,
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: ticketListSelect
  });
  const latestTickets = latestTicketsData.map(formatTicketData);
  const newestTicket = latestTickets.length > 0 ? latestTickets[0] : null;

  const topBranchesData = await db.ticket.groupBy({
    by: ['branchName'],
    where: whereBase,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });
  const topBranches = topBranchesData.map(b => ({ name: b.branchName || 'Tidak Diketahui', count: b._count.id }));

  const topRequestersData = await db.ticket.groupBy({
    by: ['requesterName'],
    where: whereBase,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });
  const topRequesters = topRequestersData.map(r => ({ name: r.requesterName || 'Tidak Diketahui', count: r._count.id }));

  return (
    <DashboardClient 
      totalRequest={totalRequest}
      requestCount={requestCount}
      onProgress={onProgress}
      completed={completed}
      slaOnTime={slaOnTimePercentage}
      picWorkload={picWorkload}
      canManageTickets={canManageTickets}
      userName={user.name}
      recentTickets={recentTickets}
      urgentTicket={urgentTicket} 
      criticalTickets={criticalTickets} 
      latestTickets={latestTickets} 
      newestTicket={newestTicket}
      topBranches={topBranches}
      topRequesters={topRequesters}
      milestones={milestones}
    />
  );
}