import React from 'react';
import { Toaster } from 'react-hot-toast';
import SidebarNav from './SidebarNav'; 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 w-full overflow-x-hidden">
      {/* Sidebar (Desktop) & Bottom Nav (Mobile) */}
      <SidebarNav />
      
      {/* Konten Halaman */}
      {/* pb-28 di mobile agar konten tidak tertutup oleh bottom navigation */}
      <main className="flex-1 w-full max-w-full p-4 md:p-10 overflow-y-auto pb-28 md:pb-10">
        {children}
      </main>

      {/* Pop-up Global Toast */}
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}