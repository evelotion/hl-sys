// src/app/(dashboard)/layout.tsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import SidebarNav from './SidebarNav';
import { requireUserForPage } from '@/src/lib/auth';
import { can } from '@/src/lib/roles';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUserForPage();

  return (
    // PERUBAHAN DI SINI: h-[100dvh] dan overflow-hidden
    <div className="flex flex-col md:flex-row h-[100dvh] bg-slate-50 w-full overflow-hidden">
      <SidebarNav
        userName={user.name}
        userRole={user.role}
        canManageUsers={can(user, 'user:manage')}
        canChangePassword={can(user, 'password:change')}
      />

      {/* Bagian <main> ini yang akan mengambil sisa ruang dan punya scroll sendiri (overflow-y-auto) */}
      <main className="flex-1 w-full max-w-full p-4 md:p-10 overflow-y-auto pb-28 md:pb-10 relative">
        {children}
      </main>

      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}
