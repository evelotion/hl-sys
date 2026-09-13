// src/lib/teamOversight.ts
// Data untuk Fase 5 (pengawasan tim Kepala Departemen / Kepala Bidang).
// getTeamBacklog HANYA boleh dipanggil kalau can(user, 'team:oversee') true di sisi pemanggil
// (src/app/(dashboard)/page.tsx) -- bukan dipanggil lalu hasilnya disembunyikan di UI. Guard
// internal di bawah ini hanya lapisan pertahanan kedua, bukan pengganti guard di pemanggil.

import type { Prisma } from '@prisma/client';
import { db } from './db';
import { can, bidangOfCategory, ASSIGNABLE_ROLES, BIDANG, ROLES, type SessionUser } from './roles';

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  title: string;
  branch: string;
  status: string;
  createdAt: string;
  slaDeadline: string | null;
}

export interface MemberBacklog {
  id: string;
  name: string;
  initial: string;
  bidang: string;
  menunggu: number;
  diproses: number;
  lewatSla: number;
  tertua: string | null;
  tickets: TicketSummary[];
}

export interface UnassignedBacklog {
  bidang: string;
  menunggu: number;
  diproses: number;
  lewatSla: number;
  tertua: string | null;
  tickets: TicketSummary[];
}

export interface TeamBacklogSummary {
  totalTiket: number;
  totalAnggotaBermasalah: number;
  totalLewatSla: number;
  belumDiassign: number;
}

export interface TeamBacklog {
  scope: 'BIDANG' | 'DEPARTEMEN';
  members: MemberBacklog[];
  unassigned: UnassignedBacklog[];
  summary: TeamBacklogSummary;
}

/**
 * Where-clause "anggota tim" dari sudut pandang user (Kepala Bidang: bidangnya sendiri,
 * Kepala Departemen: semua yang assignable). Dipakai bersama oleh getTeamBacklog dan endpoint
 * kontak (/api/team-oversight/contact/[userId]) supaya definisi anggota tim satu sumber.
 */
export function teamMemberWhereClause(user: Pick<SessionUser, 'id' | 'role' | 'team'>): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { id: { not: user.id }, role: { in: [...ASSIGNABLE_ROLES] } };
  if (user.role === ROLES.KEPALA_BIDANG) {
    return { ...base, team: user.team };
  }
  return base;
}

function toTicketSummary(t: {
  id: string; ticketNumber: string; title: string; branchName: string;
  status: string; createdAt: Date; slaDeadline: Date | null;
}): TicketSummary {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    title: t.title,
    branch: t.branchName,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    slaDeadline: t.slaDeadline ? t.slaDeadline.toISOString() : null,
  };
}

function summarizeGroup(tickets: TicketSummary[], now: Date) {
  const menunggu = tickets.filter((t) => t.status === 'OPEN').length;
  const diproses = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const lewatSla = tickets.filter((t) => t.slaDeadline && new Date(t.slaDeadline) < now).length;
  const tertua = tickets.length > 0 ? tickets[0].createdAt : null; // tickets sudah terurut createdAt asc
  return { menunggu, diproses, lewatSla, tertua };
}

export async function getTeamBacklog(user: SessionUser): Promise<TeamBacklog> {
  if (!can(user, 'team:oversee')) {
    throw new Error('getTeamBacklog dipanggil tanpa izin team:oversee');
  }

  const isDepartemen = user.role === ROLES.KEPALA_DEPARTEMEN;
  const now = new Date();

  // 1. Anggota tim -- select eksplisit, hanya id/name/initial/team (tanpa phone/email/password).
  const teamMembers = await db.user.findMany({
    where: teamMemberWhereClause(user),
    select: { id: true, name: true, initial: true, team: true },
  });
  const memberIds = teamMembers.map((m) => m.id);

  // 2. Tiket OPEN/IN_PROGRESS milik anggota tim.
  const openTickets = memberIds.length > 0
    ? await db.ticket.findMany({
        where: { picId: { in: memberIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, ticketNumber: true, title: true, branchName: true, status: true, createdAt: true, slaDeadline: true, picId: true },
      })
    : [];

  const ticketsByPic = new Map<string, TicketSummary[]>();
  for (const t of openTickets) {
    const list = ticketsByPic.get(t.picId as string) || [];
    list.push(toTicketSummary(t));
    ticketsByPic.set(t.picId as string, list);
  }

  const members: MemberBacklog[] = [];
  for (const m of teamMembers) {
    const tickets = ticketsByPic.get(m.id) || [];
    if (tickets.length === 0) continue; // hanya tampilkan anggota yang punya backlog
    const { menunggu, diproses, lewatSla, tertua } = summarizeGroup(tickets, now);
    members.push({ id: m.id, name: m.name, initial: m.initial, bidang: m.team, menunggu, diproses, lewatSla, tertua, tickets });
  }

  members.sort((a, b) => {
    if (b.lewatSla !== a.lewatSla) return b.lewatSla - a.lewatSla;
    const totalA = a.menunggu + a.diproses;
    const totalB = b.menunggu + b.diproses;
    if (totalB !== totalA) return totalB - totalA;
    const ta = a.tertua ? new Date(a.tertua).getTime() : Infinity;
    const tb = b.tertua ? new Date(b.tertua).getTime() : Infinity;
    return ta - tb;
  });

  // 3. Belum di-assign, dikelompokkan per bidang (kategori tiket -> bidang).
  const bidangsToCheck: string[] = isDepartemen ? Object.values(BIDANG) : [user.team];
  const unassignedRaw = await db.ticket.findMany({
    where: { picId: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, ticketNumber: true, title: true, branchName: true, status: true, createdAt: true, slaDeadline: true, category: true },
  });

  const unassignedByBidang = new Map<string, TicketSummary[]>();
  for (const t of unassignedRaw) {
    const bidang = bidangOfCategory(t.category);
    if (!bidangsToCheck.includes(bidang)) continue;
    const list = unassignedByBidang.get(bidang) || [];
    list.push(toTicketSummary(t));
    unassignedByBidang.set(bidang, list);
  }

  const unassigned: UnassignedBacklog[] = [];
  for (const bidang of bidangsToCheck) {
    const tickets = unassignedByBidang.get(bidang) || [];
    if (tickets.length === 0) continue;
    const { menunggu, diproses, lewatSla, tertua } = summarizeGroup(tickets, now);
    unassigned.push({ bidang, menunggu, diproses, lewatSla, tertua, tickets });
  }

  const totalTiket =
    members.reduce((s, m) => s + m.menunggu + m.diproses, 0) +
    unassigned.reduce((s, u) => s + u.menunggu + u.diproses, 0);
  const totalLewatSla =
    members.reduce((s, m) => s + m.lewatSla, 0) + unassigned.reduce((s, u) => s + u.lewatSla, 0);
  const belumDiassign = unassigned.reduce((s, u) => s + u.menunggu + u.diproses, 0);

  return {
    scope: isDepartemen ? 'DEPARTEMEN' : 'BIDANG',
    members,
    unassigned,
    summary: {
      totalTiket,
      totalAnggotaBermasalah: members.length,
      totalLewatSla,
      belumDiassign,
    },
  };
}
