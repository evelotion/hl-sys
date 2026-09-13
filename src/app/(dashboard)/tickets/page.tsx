// hl-sys/src/app/(dashboard)/tickets/page.tsx
import React from 'react';
import { db } from '@/src/lib/db';
import TicketClient from './TicketClient';
import { requireUserForPage } from '@/src/lib/auth';
import { can, ticketScopeWhere, categoryFilterForBidang, VALID_TEAMS } from '@/src/lib/roles';

export const dynamic = 'force-dynamic';

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ kategori?: string }> }) {
  const user = await requireUserForPage();
  const { kategori } = await searchParams;

  const where = kategori && VALID_TEAMS.includes(kategori)
    ? { ...ticketScopeWhere(user), category: categoryFilterForBidang(kategori) }
    : ticketScopeWhere(user);

  const canSeeSla = can(user, 'sla:view');

  const ticketsData = await db.ticket.findMany({
    where,
    select: {
      id: true,
      ticketNumber: true,
      category: true,
      title: true,
      branchName: true,
      status: true,
      createdAt: true,
      priority: true,
      pic: { select: { name: true } },
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // priority key TIDAK ditulis sama sekali (bukan didefault) kalau !canSeeSla, supaya key-nya
  // memang tidak ada di payload RSC untuk role yang tidak berhak (VIEWER).
  const formattedTickets = ticketsData.map((t) => {
    const base: {
      originalId: string; ticketNumber: string; category: string; title: string; cabang: string;
      pic: string; status: string; timestamp: number; date: string; priority?: string | null;
    } = {
      originalId: t.id,
      ticketNumber: t.ticketNumber,
      category: t.category,
      title: t.title,
      cabang: t.branchName,
      pic: t.pic?.name || 'Belum di-assign',
      status: t.status,
      timestamp: new Date(t.createdAt).getTime(),
      date: new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };
    if (canSeeSla) base.priority = t.priority;
    return base;
  });

  return <TicketClient initialTickets={formattedTickets} canCreateTicket={can(user, 'ticket:create')} canSeeSla={canSeeSla} />;
}
