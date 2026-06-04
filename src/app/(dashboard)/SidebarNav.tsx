// hl-sys/src/app/(dashboard)/SidebarNav.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, Package } from 'lucide-react';

export default function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Semua Tiket', href: '/tickets', icon: Ticket },
  ];

  return (
    // Wrapper luar pakai lebar pasti (w-64/w-72), flex-shrink-0 (biar ga melar), dan glassmorphism
    <aside className="w-64 md:w-72 flex-shrink-0 h-screen sticky top-0 flex flex-col bg-white/80 backdrop-blur-2xl border-r border-slate-200/60 shadow-[4px_0_32px_rgba(0,0,0,0.02)] z-40 transition-all duration-300">
      
      {/* Header / Logo App */}
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

      {/* Menu Navigasi */}
      <nav className="flex-1 px-4 space-y-1.5 mt-6">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group overflow-hidden ${
                isActive 
                  ? 'bg-indigo-50/50 border border-indigo-100/50 text-indigo-700 font-bold shadow-sm' 
                  : 'text-slate-500 font-semibold border border-transparent hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {/* Garis penanda aktif di sebelah kiri */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-indigo-600 rounded-r-full"></div>
              )}
              
              <Icon 
                size={18} 
                className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500 transition-colors'} 
              />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}