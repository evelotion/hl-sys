// hl-sys/src/app/(dashboard)/SidebarNav.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Ticket, Package, LogOut, Loader2, Users, FileSpreadsheet, ChevronUp, ChevronDown, Lock, Eye, EyeOff, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; 
import toast from 'react-hot-toast';

export default function SidebarNav({ userName, userRole }: { userName: string, userRole: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // --- STATE NOTIFIKASI ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifDesktopOpen, setIsNotifDesktopOpen] = useState(false);
  const [isNotifMobileOpen, setIsNotifMobileOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const notifDesktopRef = useRef<HTMLDivElement>(null);
  const notifMobileRef = useRef<HTMLDivElement>(null);

  // Fetch Notifikasi (Akan refresh otomatis setiap ganti menu/halaman)
  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setNotifications(data.data);
        }
      })
      .catch(err => console.error("Gagal ambil notifikasi:", err));
  }, [pathname]);

  // Handle Klik di luar Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target as Node)) setIsMobileDropdownOpen(false);
      if (notifDesktopRef.current && !notifDesktopRef.current.contains(event.target as Node)) setIsNotifDesktopOpen(false);
      if (notifMobileRef.current && !notifMobileRef.current.contains(event.target as Node)) setIsNotifMobileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Manajemen Tiket', href: '/tickets', icon: Ticket },
    { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
  ];

  if (userRole === 'OPERATOR') {
    navItems.push({ name: 'Manajemen User', href: '/users', icon: Users });
  }

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      return toast.error("Password baru dan konfirmasi tidak cocok!");
    }
    if (passForm.newPassword.length < 6) {
      return toast.error("Password baru minimal 6 karakter!");
    }

    setIsSubmittingPassword(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: passForm.oldPassword, newPassword: passForm.newPassword })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Password berhasil diubah!");
        setIsPasswordModalOpen(false);
        setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setIsDropdownOpen(false);
        setIsMobileDropdownOpen(false);
      } else {
        toast.error(data.error || "Gagal mengubah password.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const initial = userName ? userName.charAt(0).toUpperCase() : '?';

  // --- KOMPONEN RENDER LIST NOTIFIKASI ---
  const NotificationList = () => (
    <div className="flex flex-col h-full max-h-[350px]">
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center shrink-0">
        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Notifikasi Terbaru</span>
        {notifications.length > 0 && <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">{notifications.length} Aktivitas</span>}
      </div>
      <div className="overflow-y-auto custom-scrollbar p-2 flex-1">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs font-medium">Belum ada aktivitas terbaru.</div>
        ) : (
          notifications.map(notif => (
            <div 
              key={notif.id} 
              onClick={() => {
                setIsNotifDesktopOpen(false); setIsNotifMobileOpen(false);
                if(notif.ticket?.id) router.push(`/tickets/${notif.ticket.id}`);
              }}
              className="p-3 mb-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl cursor-pointer transition-all flex gap-3 group"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-black text-[10px] border border-indigo-100">
                {notif.user?.initial || 'SYS'}
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-600 mb-0.5 group-hover:text-indigo-700 transition-colors">{notif.ticket?.ticketNumber || 'Tugas Dihapus'}</p>
                <p className="text-xs text-slate-600 leading-snug"><span className="font-bold text-slate-800">{notif.user?.name || 'Sistem'}</span> {notif.message}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

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

        {/* --- BOTTOM SECTION DESKTOP (Notif + Profile) --- */}
        <div className="p-4 border-t border-slate-100/50 shrink-0 bg-white/80 flex gap-2">
          
          {/* Lonceng Notif Desktop */}
          <div className="relative" ref={notifDesktopRef}>
            <button 
              onClick={() => setIsNotifDesktopOpen(!isNotifDesktopOpen)} 
              className={`p-2.5 rounded-xl border transition-colors relative flex items-center justify-center ${isNotifDesktopOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}
            >
              <Bell size={18} />
              {notifications.length > 0 && <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
            </button>
            <AnimatePresence>
              {isNotifDesktopOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute bottom-full left-0 mb-3 w-80 bg-white border border-slate-200/60 shadow-[0_10px_40px_rgb(0,0,0,0.12)] rounded-2xl z-50 overflow-hidden origin-bottom-left"
                >
                  <NotificationList />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profil Dropdown Desktop */}
          <div className="relative flex-1" ref={dropdownRef}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors border ${isDropdownOpen ? 'bg-slate-50 border-slate-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-200 shrink-0">
                  {initial}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-700 truncate">{userName.split(' ')[0]}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{userRole?.replace('_', ' ')}</p>
                </div>
              </div>
              <ChevronUp size={14} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute bottom-full right-0 mb-3 w-56 bg-white border border-slate-200/60 shadow-[0_10px_40px_rgb(0,0,0,0.08)] rounded-xl p-2 z-50 flex flex-col gap-1 origin-bottom-right"
                >
                  <div className="px-3 py-2 mb-1 border-b border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sesi Aktif ({userName})</p>
                  </div>
                  
                  <button onClick={() => { setIsPasswordModalOpen(true); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-sm group">
                    <Lock size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span>Ganti Password</span>
                  </button>

                  <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-70 text-sm">
                    {isLoggingOut ? <Loader2 size={16} className="animate-spin text-red-500" /> : <LogOut size={16} className="text-red-500 group-hover:scale-110 transition-transform" />}
                    <span>{isLoggingOut ? 'Keluar...' : 'Keluar Sistem'}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
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

        <div className="flex items-center gap-3">
          {/* Lonceng Notif Mobile */}
          <div className="relative" ref={notifMobileRef}>
            <button 
              onClick={() => setIsNotifMobileOpen(!isNotifMobileOpen)} 
              className={`p-2 rounded-full border transition-colors relative flex items-center justify-center ${isNotifMobileOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <Bell size={16} />
              {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>}
            </button>
            <AnimatePresence>
              {isNotifMobileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-3 w-80 bg-white border border-slate-200/60 shadow-[0_10px_40px_rgb(0,0,0,0.12)] rounded-2xl z-50 overflow-hidden origin-top-right"
                >
                  <NotificationList />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown Mobile */}
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
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-3 w-48 bg-white border border-slate-200/60 shadow-[0_10px_40px_rgb(0,0,0,0.1)] rounded-xl p-2 z-50 origin-top-right flex flex-col gap-1"
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-700 truncate">{userName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{userRole?.replace('_', ' ')}</p>
                  </div>
                  
                  <button onClick={() => { setIsPasswordModalOpen(true); setIsMobileDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-slate-600 font-bold hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-xs">
                    <Lock size={14} /> Ganti Password
                  </button>

                  <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-2 px-3 py-2.5 text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors text-xs disabled:opacity-70">
                    {isLoggingOut ? <Loader2 size={14} className="animate-spin text-red-500" /> : <LogOut size={14} />}
                    {isLoggingOut ? 'Keluar...' : 'Keluar Sistem'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* =========================================
          MOBILE BOTTOM NAV 
          ========================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t border-slate-200/60 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center px-2 py-2">
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

      {/* =========================================
          MODAL GANTI PASSWORD
          ========================================= */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-800">
                  <Lock size={18} className="text-indigo-600" />
                  <h3 className="font-black">Ganti Password</h3>
                </div>
                <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
              </div>

              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-slate-500">Password Lama</label>
                  <div className="relative">
                    <input 
                      type={showOld ? "text" : "password"} 
                      required 
                      value={passForm.oldPassword} 
                      onChange={(e) => setPassForm({ ...passForm, oldPassword: e.target.value })} 
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300 pr-10" 
                      placeholder="Masukkan password saat ini"
                    />
                    <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                      {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-slate-500">Password Baru</label>
                  <div className="relative">
                    <input 
                      type={showNew ? "text" : "password"} 
                      required 
                      value={passForm.newPassword} 
                      onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })} 
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300 pr-10" 
                      placeholder="Minimal 6 karakter"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-slate-500">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <input 
                      type={showConfirm ? "text" : "password"} 
                      required 
                      value={passForm.confirmPassword} 
                      onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })} 
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300 pr-10" 
                      placeholder="Ulangi password baru"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingPassword} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-70 text-sm">
                    {isSubmittingPassword ? <Loader2 size={16} className="animate-spin" /> : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}