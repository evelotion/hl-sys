import React from 'react';
import { db } from '@/src/lib/db';
import ReportsClient from './ReportsClient';
import { requireUserForPage } from '@/src/lib/auth';
import { ticketScopeWhere } from '@/src/lib/roles';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const user = await requireUserForPage();

  const tickets = await db.ticket.findMany({
    where: ticketScopeWhere(user),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      ticketNumber: true,
      priority: true,
      requestDate: true,
      category: true,
      branchName: true,
      requesterName: true,
      title: true,
      status: true,
      pic: { select: { name: true, initial: true, team: true } },
    }
  });
  return <ReportsClient tickets={tickets} />;
}
