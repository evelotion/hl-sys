// src/app/(dashboard)/tickets/[id]/page.tsx
import React from 'react';
import { db } from '@/src/lib/db';
import TaskViewClient from './TaskViewClient';
import { notFound } from 'next/navigation';
import { requireUserForPage } from '@/src/lib/auth';
import { can, ASSIGNABLE_ROLES } from '@/src/lib/roles';
import { toTicketDTO } from '@/src/lib/ticketDto';

export default async function TaskViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const currentUser = await requireUserForPage();

  const ticket = await db.ticket.findUnique({
    where: { id: id },
    select: {
      id: true, ticketNumber: true, title: true, description: true, category: true, status: true,
      issueImgUrl: true, proofImgUrl: true, branchName: true, requesterName: true, requesterEmail: true,
      mediaRequest: true, requestDate: true, slaDeadline: true, picId: true, createdAt: true, resolvedAt: true, priority: true,
      pic: { select: { id: true, name: true, initial: true, phone: true, email: true, team: true } },
      logs: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, action: true, message: true, createdAt: true, user: { select: { name: true, initial: true, role: true } } }
      }
    }
  });

  if (!ticket) {
    notFound();
  }

  const ticketCtx = { picId: ticket.picId, category: ticket.category, picTeam: ticket.pic?.team };
  const perms = {
    canEdit: can(currentUser, 'ticket:edit', ticketCtx),
    canDelete: can(currentUser, 'ticket:delete', ticketCtx),
    canChangeStatus: can(currentUser, 'ticket:status', ticketCtx),
    canComment: can(currentUser, 'ticket:comment', ticketCtx),
    canSeeSla: can(currentUser, 'sla:view'),
    canSeeContact: can(currentUser, 'contact:view'),
  };

  const pics = await db.user.findMany({
    where: { role: { in: [...ASSIGNABLE_ROLES] } },
    select: { id: true, name: true, initial: true, role: true, team: true },
    orderBy: { name: 'asc' }
  });

  const ticketDto = toTicketDTO(ticket, { canSeeSla: perms.canSeeSla, canSeeContact: perms.canSeeContact });

  return (
    <TaskViewClient
      initialTicket={ticketDto}
      pics={pics}
      currentUser={currentUser}
      perms={perms}
    />
  );
}
