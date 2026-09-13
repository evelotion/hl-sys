import React from 'react';
import { db } from '@/src/lib/db';
import UserClient from './UserClient';
import { requireUserForPage } from '@/src/lib/auth';
import { can } from '@/src/lib/roles';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await requireUserForPage();

  if (!can(user, 'user:manage')) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm">
          <h2 className="text-lg font-black text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-sm text-slate-500">Anda tidak memiliki izin untuk mengelola user.</p>
        </div>
      </div>
    );
  }

  const users = await db.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, initial: true, name: true, phone: true, email: true, role: true, team: true },
  });
  return <UserClient initialUsers={users} />;
}
