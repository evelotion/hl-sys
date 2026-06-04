// src/app/(dashboard)/layout.tsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import SidebarNav from './SidebarNav'; 
import { cookies } from 'next/headers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('user_session')?.value;
  const user = sessionStr ? JSON.parse(sessionStr) : { name: 'Guest', role: 'UNKNOWN' };

  return (
    // PERUBAHAN DI SINI: h-[100dvh] dan overflow-hidden
    <div className="flex flex-col md:flex-row h-[100dvh] bg-slate-50 w-full overflow-hidden">
      <SidebarNav userName={user.name} userRole={user.role} />
      
      {/* Bagian <main> ini yang akan mengambil sisa ruang dan punya scroll sendiri (overflow-y-auto) */}
      <main className="flex-1 w-full max-w-full p-4 md:p-10 overflow-y-auto pb-28 md:pb-10 relative">
        {children}
      </main>

      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}