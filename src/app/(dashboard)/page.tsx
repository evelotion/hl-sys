// hl-sys/src/app/(dashboard)/page.tsx
import React from 'react';
import { db } from '@/src/lib/db';
import DashboardClient from './DashboardClient';
import { requireUserForPage } from '@/src/lib/auth';
import { can, ticketScopeWhere, hasFullTicketScope, ASSIGNABLE_ROLES, BIDANG } from '@/src/lib/roles';
import { getBusinessMinutesBetween } from '@/src/lib/businessDays';
import { getBidangBreakdown } from '@/src/lib/dashboardStats';
import { getTeamBacklog } from '@/src/lib/teamOversight';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUserForPage();

  const whereBase = ticketScopeWhere(user);
  const canManageTickets = user.role === 'OPERATOR' || user.role === 'KEPALA_DEPARTEMEN' || user.role === 'KEPALA_BIDANG';
  const canDrilldownBidang = hasFullTicketScope(user);
  const bidangBreakdown = await getBidangBreakdown('month');

  // Fase 5: getTeamBacklog HANYA dipanggil kalau team:oversee true -- bukan dipanggil lalu
  // hasilnya disembunyikan di UI untuk PIC/VIEWER.
  const canOversee = can(user, 'team:oversee');
  const teamOversight = canOversee
    ? { backlog: await getTeamBacklog(user), sessionSid: user.sid }
    : null;

  // Fase 6: dihitung sekali, dipakai untuk melewati (bukan cuma menyaring hasil) query-query
  // SLA sepenuhnya kalau role tidak berhak melihat SLA (VIEWER).
  const canSeeSla = can(user, 'sla:view');
  const canSeeContact = can(user, 'contact:view');
  const ticketDtoPerms = { canSeeSla, canSeeContact };

  // 1. KPI Metrik
  const totalRequest = await db.ticket.count({ where: whereBase });
  const requestCount = await db.ticket.count({ where: { ...whereBase, status: 'OPEN' } });
  const onProgress = await db.ticket.count({ where: { ...whereBase, status: 'IN_PROGRESS' } });
  const completed = await db.ticket.count({ where: { ...whereBase, status: 'DONE' } });

  // 2. SLA Tracking -- query & perhitungan dilewati SEPENUHNYA kalau !canSeeSla, bukan
  // dihitung lalu disembunyikan.
  let slaOnTimePercentage = 0;
  if (canSeeSla) {
    const allTicketsForSLA = await db.ticket.findMany({
      where: whereBase,
      select: { createdAt: true, resolvedAt: true, slaDeadline: true, status: true }
    });

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
    }
  }

  // 3. Beban Kerja PIC & LOGIKA MILESTONE APRESIASI
  const pics = await db.user.findMany({
    where: { role: { in: [...ASSIGNABLE_ROLES] } },
    select: { name: true, initial: true, team: true, tasks: { select: { status: true, resolvedAt: true } } }
  });

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
    
    if (pic.team === BIDANG.P3) picWorkload.P3.push(picData);
    else if (pic.team === BIDANG.PENGADAAN) picWorkload.Pengadaan.push(picData);
    else if (pic.team === BIDANG.PEMBAYARAN) picWorkload.Pembayaran.push(picData);
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

  // Fase 6: key sla/priority/picPhone/picEmail SENGAJA tidak ditulis sama sekali (bukan
  // didefault-kan) kalau perms tidak mengizinkan -- supaya key-nya benar-benar tidak ada di
  // payload RSC yang dikirim ke client untuk role yang tidak berhak (VIEWER).
  const formatTicketData = (t: any, perms: { canSeeSla: boolean; canSeeContact: boolean }) => {
    let progress = 25;
    if (t.status === 'IN_PROGRESS') progress = 65;
    if (t.status === 'DONE') progress = 100;

    const base: {
      id: string; originalId: string; status: string; progress: number; pic: string; picName: string;
      title: string; category: string; cabang: string; date: string;
      sla?: number; priority?: string; picPhone?: string; picEmail?: string;
    } = {
      id: t.ticketNumber,
      originalId: t.id, // <-- INI YANG PENTING UNTUK ROUTING KE DETAIL TIKET
      status: t.status === 'IN_PROGRESS' ? 'ON PROGRESS' : (t.status === 'DONE' ? 'COMPLETED' : 'REQUEST'),
      progress: progress,
      pic: t.pic?.initial || 'N/A',
      picName: t.pic?.name || 'PIC',
      title: t.title,
      category: t.category,
      cabang: t.branchName,
      date: new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB'
    };

    if (perms.canSeeSla) {
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
      base.sla = sla;
      base.priority = t.priority || 'MEDIUM';
    }

    if (perms.canSeeContact) {
      base.picPhone = t.pic?.phone || '';
      base.picEmail = t.pic?.email || '';
    }

    return base;
  };

  const ticketListSelect = {
    id: true, ticketNumber: true, status: true, createdAt: true, resolvedAt: true, slaDeadline: true,
    title: true, category: true, priority: true, branchName: true,
    pic: { select: { initial: true, name: true, phone: true, email: true } },
  } as const;

  // "SLA Kritis" dilewati sepenuhnya (query TIDAK dijalankan) kalau !canSeeSla -- bukan
  // dihitung lalu disaring/disembunyikan. Urutan berdasarkan slaDeadline pun tidak pernah
  // dihitung untuk role yang tidak berhak melihat SLA.
  let urgentTicket: ReturnType<typeof formatTicketData> | null = null;
  let criticalTickets: ReturnType<typeof formatTicketData>[] = [];
  if (canSeeSla) {
    const activeSlaTickets = await db.ticket.findMany({
      where: { ...whereBase, status: { not: 'DONE' }, slaDeadline: { not: null } },
      orderBy: { slaDeadline: 'asc' },
      select: ticketListSelect
    });

    const formattedActiveSla = activeSlaTickets.map(t => formatTicketData(t, ticketDtoPerms));
    urgentTicket = formattedActiveSla.length > 0 ? formattedActiveSla[0] : null;
    criticalTickets = formattedActiveSla.filter(t => (t.sla ?? 0) >= 80);
  }

  const recentData = await db.ticket.findMany({
    where: { ...whereBase, status: 'IN_PROGRESS' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: ticketListSelect
  });
  const recentTickets = recentData.map(t => formatTicketData(t, ticketDtoPerms));

  const latestTicketsData = await db.ticket.findMany({
    where: whereBase,
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: ticketListSelect
  });
  const latestTickets = latestTicketsData.map(t => formatTicketData(t, ticketDtoPerms));
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
      bidangBreakdown={bidangBreakdown}
      canDrilldownBidang={canDrilldownBidang}
      teamOversight={teamOversight}
      canSeeSla={canSeeSla}
    />
  );
}