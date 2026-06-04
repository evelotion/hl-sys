// src/app/(dashboard)/layout.tsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import SidebarNav from './SidebarNav'; 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigasi Utama */}
      <SidebarNav />
      
      {/* Konten Halaman */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>

      {/* Pop-up Global Toast Level 1 */}
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}