// src/app/(dashboard)/SidebarNav.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Ticket, Package, LogOut, Loader2, Users, FileSpreadsheet, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // <-- Tambahan framer-motion untuk animasi dropdown

export default function SidebarNav({ userName, userRole }: { userName: string, userRole: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // State untuk Dropdown Profil
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  
  // Referensi untuk deteksi klik di luar dropdown (opsional tapi bagus buat UX)
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fungsi tutup dropdown kalau user klik area di luar menu
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target as Node)) setIsMobileDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Manajemen Tiket', href: '/tickets', icon: Ticket }, // <-- Nama disamakan dengan Poin 4
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

  const initial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <>
      {/* =========================================
          DESKTOP SIDEBAR 
          ========================================= */}
      <aside className="hidden md:flex w-64 md:w-72 flex-shrink-0 h-full flex-col bg-white/80 backdrop-blur-2xl border-r border-slate-200/60 shadow-[4px_0_32px_rgba(0,0,0,0.02)] z-40 transition-all duration-300">  
        <div className="h-20 flex items-center px-8 border-b border-slate-100/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
              <Package size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">HL-SYS</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Departemen Logistik</p>
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

        {/* IMPROVE POIN 10: Profil Pengguna & Dropdown Logout Desktop */}
        <div className="relative p-4 border-t border-slate-100/50 shrink-0 bg-white/80" ref={dropdownRef}>
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-slate-200/60 shadow-[0_10px_40px_rgb(0,0,0,0.08)] rounded-xl p-2 z-50"
              >
                <div className="px-3 py-2 mb-1 border-b border-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sesi Aktif</p>
                </div>
                <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-70 text-sm">
                  {isLoggingOut ? <Loader2 size={16} className="animate-spin text-red-500" /> : <LogOut size={16} className="text-red-500 group-hover:scale-110 transition-transform" />}
                  <span>{isLoggingOut ? 'Keluar...' : 'Keluar Sistem'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${isDropdownOpen ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-200 shrink-0">
                {initial}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-700 truncate">{userName}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{userRole?.replace('_', ' ')}</p>
              </div>
            </div>
            <ChevronUp size={16} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>
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

        {/* IMPROVE POIN 10: Dropdown Logout Mobile */}
        <div className="relative" ref={mobileDropdownRef}>
          <div 
            onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)} 
            className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-200 cursor-pointer shadow-sm active:scale-95 transition-transform"
          >
            {initial}
          </div>

          <AnimatePresence>
            {isMobileDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: -10, scale: 0.95 }} 
                transition={{ duration: 0.2 }}
                className="absolute top-full right-0 mt-3 w-48 bg-white border border-slate-200/60 shadow-[0_10px_40px_rgb(0,0,0,0.1)] rounded-xl p-2 z-50 origin-top-right"
              >
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-700 truncate">{userName}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{userRole?.replace('_', ' ')}</p>
                </div>
                <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-2 px-3 py-2.5 text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors text-xs disabled:opacity-70">
                  {isLoggingOut ? <Loader2 size={14} className="animate-spin text-red-500" /> : <LogOut size={14} />}
                  {isLoggingOut ? 'Keluar...' : 'Keluar Sistem'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* =========================================
          MOBILE BOTTOM NAV 
          ========================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t border-slate-200/60 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center px-2 py-2">
          {/* Karena tombol logout pindah ke atas, sekarang item menu bisa jadi 25% (lebih lega) */}
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-[25%] gap-1 active:scale-95 transition-transform my-1">
                <div className={`p-1.5 rounded-full transition-colors ${isActive ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[8px] sm:text-[9px] font-bold text-center leading-tight ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}