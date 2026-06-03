// hl-sys/src/app/(dashboard)/SidebarNav.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket } from 'lucide-react';

export default function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Semua Tiket', href: '/tickets', icon: Ticket },
  ];

  return (
    <nav className="flex-1 px-4 space-y-1.5 mt-2">
      {navItems.map((item) => {
        // Logic aktif: Persis sama dengan '/' atau untuk '/tickets' mencakup sub-halumannya juga
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link 
            key={item.href}
            href={item.href} 
            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group overflow-hidden ${
              isActive 
                ? 'bg-slate-50 border border-slate-100 text-indigo-600 font-bold shadow-sm' 
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
  );
}