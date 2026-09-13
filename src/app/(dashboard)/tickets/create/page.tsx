// src/app/(dashboard)/tickets/create/page.tsx
import React from 'react';
import { db } from '@/src/lib/db';
import CreateTicketClient from './CreateTicketClient';
import { requireUserForPage } from '@/src/lib/auth';
import { can, ASSIGNABLE_ROLES } from '@/src/lib/roles';

export const dynamic = 'force-dynamic';

export default async function CreateTicketPage() {
  const user = await requireUserForPage();

  if (!can(user, 'ticket:create')) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm">
          <h2 className="text-lg font-black text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-sm text-slate-500">Anda tidak memiliki izin untuk membuat tiket baru.</p>
        </div>
      </div>
    );
  }

  // Ambil data PIC beserta Inisial, NOMOR HP, dan EMAIL
  const pics = await db.user.findMany({
    where: { role: { in: [...ASSIGNABLE_ROLES] } },
    select: {
      id: true,
      name: true,
      initial: true,
      phone: true,
      email: true,
      role: true,
      team: true
    },
    orderBy: { name: 'asc' }
  });

  // Lempar variabel pics ke dalam kurung kurawal, bukan tanda kutip
  return <CreateTicketClient pics={pics} />;
}
