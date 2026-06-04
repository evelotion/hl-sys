// src/app/(dashboard)/SidebarNav.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Ticket, Package, LogOut, Loader2, Users, FileSpreadsheet } from 'lucide-react';

// Tambahkan interface untuk props
export default function SidebarNav({ userName, userRole }: { userName: string, userRole: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Semua Tiket', href: '/tickets', icon: Ticket },
    { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
    { name: 'Manajemen User', href: '/users', icon: Users },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error("Gagal logout:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* =========================================
          DESKTOP SIDEBAR 
          ========================================= */}
      <aside className="hidden md:flex w-64 md:w-72 flex-shrink-0 h-[100dvh] sticky top-0 flex-col bg-white/80 backdrop-blur-2xl border-r border-slate-200/60 shadow-[4px_0_32px_rgba(0,0,0,0.02)] z-40 transition-all duration-300">
        
        <div className="h-20 flex items-center px-8 border-b border-slate-100/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
              <Package size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">HL-SYS</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Logistik</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-6 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group overflow-hidden ${isActive ? 'bg-indigo-50/50 border border-indigo-100/50 text-indigo-700 font-bold shadow-sm' : 'text-slate-500 font-semibold border border-transparent hover:bg-slate-50 hover:text-slate-800'}`}>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-indigo-600 rounded-r-full"></div>}
                <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500 transition-colors'} />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profil Pengguna & Tombol Logout */}
        <div className="p-4 border-t border-slate-100/50 shrink-0 bg-white/80">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-200 shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-700 truncate">{userName}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{userRole?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 font-semibold hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors group disabled:opacity-70">
            {isLoggingOut ? <Loader2 size={18} className="animate-spin text-red-500" /> : <LogOut size={18} className="text-slate-400 group-hover:text-red-500 transition-colors" />}
            <span>{isLoggingOut ? 'Keluar...' : 'Keluar Sistem'}</span>
          </button>
        </div>
      </aside>

      {/* =========================================
          MOBILE TOP HEADER 
          ========================================= */}
      <div className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-200/60 p-4 pt-safe flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_4px_10px_rgba(79,70,229,0.3)]">
            <Package size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-none">HL-SYS</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Logistik Pusat</p>
          </div>
        </div>
        {/* Avatar Profil Mobile */}
        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-200">
          {userName ? userName.charAt(0).toUpperCase() : '?'}
        </div>
      </div>

      {/* =========================================
          MOBILE BOTTOM NAV 
          ========================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t border-slate-200/60 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap justify-around items-center px-2 py-2">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-[20%] gap-1 active:scale-95 transition-transform my-1">
                <div className={`p-1.5 rounded-full transition-colors ${isActive ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[8px] sm:text-[9px] font-bold text-center leading-tight ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>{item.name}</span>
              </Link>
            );
          })}
          
          <button onClick={handleLogout} disabled={isLoggingOut} className="flex flex-col items-center justify-center w-[20%] gap-1 active:scale-95 transition-transform text-slate-400 hover:text-red-500 my-1">
             <div className="p-1.5 rounded-full transition-colors">
               {isLoggingOut ? <Loader2 size={20} className="animate-spin text-red-500" /> : <LogOut size={20} />}
             </div>
             <span className="text-[8px] sm:text-[9px] font-bold text-center leading-tight">{isLoggingOut ? '...' : 'Keluar'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}