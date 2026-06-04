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
  // Ambil data session dari cookies
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('user_session')?.value;
  const user = sessionStr ? JSON.parse(sessionStr) : { name: 'Guest', role: 'UNKNOWN' };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 w-full overflow-x-hidden">
      {/* Lempar data user ke Sidebar */}
      <SidebarNav userName={user.name} userRole={user.role} />
      
      <main className="flex-1 w-full max-w-full p-4 md:p-10 overflow-y-auto pb-28 md:pb-10">
        {children}
      </main>

      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}