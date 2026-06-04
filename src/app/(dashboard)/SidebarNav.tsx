"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Ticket, Package, LogOut, Loader2 } from 'lucide-react';

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Semua Tiket', href: '/tickets', icon: Ticket },
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
          DESKTOP SIDEBAR (Sembunyi di Layar HP)
          ========================================= */}
      <aside className="hidden md:flex w-64 md:w-72 flex-shrink-0 h-screen sticky top-0 flex-col bg-white/80 backdrop-blur-2xl border-r border-slate-200/60 shadow-[4px_0_32px_rgba(0,0,0,0.02)] z-40 transition-all duration-300">
        <div className="h-20 flex items-center px-8 border-b border-slate-100/50">
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
        <nav className="flex-1 px-4 space-y-1.5 mt-6">
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
        <div className="p-4 border-t border-slate-100/50">
          <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 font-semibold hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors group disabled:opacity-70">
            {isLoggingOut ? <Loader2 size={18} className="animate-spin text-red-500" /> : <LogOut size={18} className="text-slate-400 group-hover:text-red-500 transition-colors" />}
            <span>{isLoggingOut ? 'Keluar...' : 'Keluar Sistem'}</span>
          </button>
        </div>
      </aside>

      {/* =========================================
          MOBILE TOP HEADER (Muncul di Layar HP)
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
      </div>

      {/* =========================================
          MOBILE BOTTOM NAV (Muncul di Layar HP)
          ========================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t border-slate-200/60 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform">
                <div className={`p-1.5 rounded-full transition-colors ${isActive ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] font-bold ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>{item.name}</span>
              </Link>
            );
          })}
          
          <button onClick={handleLogout} disabled={isLoggingOut} className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform text-slate-400 hover:text-red-500">
             <div className="p-1.5 rounded-full transition-colors">
               {isLoggingOut ? <Loader2 size={20} className="animate-spin text-red-500" /> : <LogOut size={20} />}
             </div>
             <span className="text-[9px] font-bold">{isLoggingOut ? '...' : 'Keluar'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}