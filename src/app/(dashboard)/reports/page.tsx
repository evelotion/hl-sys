import React from 'react';
import { db } from '@/src/lib/db';
import ReportsClient from './ReportsClient';
import { requireUserForPage } from '@/src/lib/auth';
import { can, ticketScopeWhere } from '@/src/lib/roles';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const user = await requireUserForPage();

  // Fase 6: sebelumnya endpoint ini tidak mengecek permission sama sekali -- siapa pun yang
  // login (termasuk yang seharusnya tidak boleh export) bisa mengunduh Excel. Sekarang
  // seluruh data tiket (termasuk field priority, yang termasuk aturan SLA) HANYA di-query dan
  // dikirim ke client kalau report:export true -- bukan di-query lalu tombolnya disembunyikan.
  if (!can(user, 'report:export')) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Report & Unduh Data</h2>
          <p className="text-slate-500 mt-1 font-medium text-xs">Pusat penarikan data operasional tiket logistik secara keseluruhan.</p>
        </div>
        <div className="bg-white p-8 rounded-[24px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">
          <p className="text-sm text-slate-500">Anda tidak memiliki izin untuk mengunduh laporan Excel.</p>
        </div>
      </div>
    );
  }

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
