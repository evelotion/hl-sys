// hl-sys/src/app/(dashboard)/DashboardClient.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation"; 
import { FileText, Clock, CheckCircle2, Timer, ChevronDown, User, Tags, AlertCircle, X, Info, MessageCircle, Mail, ChevronLeft, ChevronRight, ExternalLink, Trophy, MapPin, Bell } from "lucide-react"; 

interface PICWorkloadData { name: string; initial: string; activeTasks: number; completed: number; }
interface PICWorkloadGroup { P3: PICWorkloadData[]; Pengadaan: PICWorkloadData[]; Pembayaran: PICWorkloadData[]; Lainnya: PICWorkloadData[]; }

interface TicketData {
  id: string; status: string; progress: number; sla: number; pic: string;
  picName?: string; picPhone?: string; picEmail?: string; priority?: string;
  title?: string; category?: string; cabang?: string; date?: string;
}

interface LeaderboardItem { name: string; count: number; }

export default function DashboardClient({
  totalRequest, requestCount, onProgress, completed, slaOnTime, picWorkload, userRole, recentTickets, userName, urgentTicket, criticalTickets, latestTickets, newestTicket, topBranches, topRequesters
}: {
  totalRequest: number; requestCount: number; onProgress: number; completed: number; slaOnTime: number; picWorkload: PICWorkloadGroup; userRole: string; recentTickets: TicketData[]; userName: string; urgentTicket?: TicketData | null;
  criticalTickets: TicketData[]; latestTickets: TicketData[]; newestTicket?: TicketData | null; topBranches: LeaderboardItem[]; topRequesters: LeaderboardItem[];
}) {
  const router = useRouter(); 

  const safeTotal = totalRequest === 0 ? 1 : totalRequest;
  const donePercentage = totalRequest === 0 ? 0 : Math.round((completed / safeTotal) * 100);
  const progressPercentage = totalRequest === 0 ? 0 : Math.round((onProgress / safeTotal) * 100);
  const requestPercentage = totalRequest === 0 ? 0 : Math.round((requestCount / safeTotal) * 100);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const doneStroke = (donePercentage / 100) * circumference;

  const [selectedUrgentTicket, setSelectedUrgentTicket] = useState<TicketData | null>(null);
  const [activeContextList, setActiveContextList] = useState<TicketData[]>([]);

  const [showCriticalList, setShowCriticalList] = useState(false); 
  const [showLatestList, setShowLatestList] = useState(false);

  // --- STATE NOTIFIKASI & LOGIC UNREAD ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false); // State untuk titik merah
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => { 
        if (data.success && data.data && data.data.length > 0) { 
          setNotifications(data.data);
          
          // Cek ID notifikasi terbaru vs yang terakhir dilihat di browser
          const newestNotifId = data.data[0].id;
          const lastSeenNotifId = localStorage.getItem('last_seen_notif_id');
          
          if (newestNotifId !== lastSeenNotifId) {
            setHasUnread(true); // Nyalakan lampu merah jika ada yang baru
          }
        } 
      })
      .catch(err => console.error("Gagal ambil notifikasi:", err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // FUNGSI HANDLE KLIK LONCENG
  const handleToggleNotif = () => {
    setIsNotifOpen(!isNotifOpen);
    
    // Jika dropdown dibuka dan ada notifikasi, matikan titik merah & simpan ID ke memori browser
    if (!isNotifOpen && notifications.length > 0) {
      setHasUnread(false);
      localStorage.setItem('last_seen_notif_id', notifications[0].id);
    }
  };

  const [greeting, setGreeting] = useState("Selamat Datang");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setGreeting("Selamat Pagi");
    else if (hour < 15) setGreeting("Selamat Siang");
    else if (hour < 18) setGreeting("Selamat Sore");
    else setGreeting("Selamat Malam");
  }, []);

  const getStatusColor = (status: string) => {
    if (status === "COMPLETED") return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (status === "ON PROGRESS") return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-blue-600 bg-blue-50 border-blue-100";
  };
  const getBarColor = (status: string) => {
    if (status === "COMPLETED") return "bg-emerald-500";
    if (status === "ON PROGRESS") return "bg-amber-500";
    return "bg-blue-500";
  };

  const firstName = userName ? userName.split(" ")[0] : "Guest";

  const handleFollowUpWA = (ticket: TicketData) => {
    if (!ticket.picPhone) return alert('Nomor WhatsApp PIC belum terdaftar!');
    let waNumber = ticket.picPhone.replace(/[^0-9]/g, '');
    if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1);
    const text = `Halo ${ticket.picName}, mohon update progress untuk tiket *${ticket.id}* (${ticket.title}). SLA saat ini sudah mencapai *${ticket.sla}%*. Terima kasih!`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleFollowUpTeams = (ticket: TicketData) => {
    if (!ticket.picEmail) return alert('Email Teams PIC belum terdaftar!');
    const text = `Halo ${ticket.picName}, mohon update progress untuk tiket ${ticket.id} (${ticket.title}). SLA saat ini sudah mencapai ${ticket.sla}%. Terima kasih!`;
    window.open(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(ticket.picEmail)}&message=${encodeURIComponent(text)}`, '_blank');
  };

  const renderPICGroup = (title: string, data: PICWorkloadData[]) => {
    if (data.length === 0) return null;
    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {data.map((pic, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">{pic.initial}</div>
                <span className="font-bold text-slate-700 text-xs truncate max-w-[120px]">{pic.name}</span>
              </div>
              <div className="flex gap-2 text-[10px] flex-wrap justify-end">
                <span className="text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 whitespace-nowrap">{pic.activeTasks} Antrean</span>
                <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 whitespace-nowrap">{pic.completed} Selesai</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const currentIndex = selectedUrgentTicket ? activeContextList.findIndex(t => t.id === selectedUrgentTicket.id) : -1;
  const hasNext = currentIndex >= 0 && currentIndex < activeContextList.length - 1;
  const hasPrev = currentIndex > 0;

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER WITH NOTIFICATION BELL */}
      <div className="flex justify-between items-start mb-6 md:mb-8 relative z-40">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{greeting}, <span className="text-indigo-600">{firstName}</span>!</h1>
          <p className="text-slate-500 mt-1 font-medium text-xs md:text-sm">Berikut adalah ringkasan performa sistem logistik hari ini.</p>
        </motion.div>

        <div className="relative" ref={notifRef}>
          <button 
            onClick={handleToggleNotif} 
            className={`p-3 rounded-full border transition-all shadow-sm relative flex items-center justify-center ${isNotifOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}
          >
            <Bell size={20} />
            {hasUnread && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
          </button>
          
          <AnimatePresence>
            {isNotifOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200/60 shadow-[0_15px_50px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden origin-top-right flex flex-col"
              >
                <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-wide">Notifikasi Terbaru</span>
                  {notifications.length > 0 && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">{notifications.length} Info</span>}
                </div>
                <div className="overflow-y-auto max-h-[400px] custom-scrollbar p-3 flex-1 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm font-medium">Belum ada aktivitas terbaru.</div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => {
                          setIsNotifOpen(false);
                          if(notif.ticket?.id) router.push(`/tickets/${notif.ticket.id}`);
                        }}
                        className="p-4 bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 shadow-sm rounded-xl cursor-pointer transition-all flex gap-4 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-black text-xs border border-indigo-100">
                          {notif.user?.initial || 'SYS'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-indigo-600 mb-1 group-hover:text-indigo-700 transition-colors">{notif.ticket?.ticketNumber || 'Tugas Dihapus'}</p>
                          <p className="text-sm text-slate-600 leading-snug"><span className="font-bold text-slate-800">{notif.user?.name || 'Sistem'}</span> {notif.message}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1"><Clock size={10}/> {new Date(notif.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3"><FileText size={18} className="text-indigo-500" /><span className="text-[10px] font-bold uppercase tracking-wider">Total Request</span></div>
          <div><p className="text-3xl md:text-4xl font-black text-slate-800">{totalRequest}</p></div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3"><Clock size={18} className="text-blue-500" /><span className="text-[10px] font-bold uppercase tracking-wider">On Progress</span></div>
          <div><p className="text-3xl md:text-4xl font-black text-slate-800">{onProgress}</p></div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3"><CheckCircle2 size={18} className="text-emerald-500" /><span className="text-[10px] font-bold uppercase tracking-wider">Completed</span></div>
          <div><p className="text-3xl md:text-4xl font-black text-slate-800">{completed}</p></div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3"><Timer size={18} className="text-indigo-600" /><span className="text-[10px] font-bold uppercase tracking-wider">SLA On Time</span></div>
          <div><p className="text-3xl md:text-4xl font-black text-slate-800">{slaOnTime}%</p></div>
        </div>
      </div>

      <details className="group bg-blue-50/60 border border-blue-100 rounded-2xl shadow-sm mt-3 marker:content-[''] transition-all duration-300">
        <summary className="flex items-center justify-between p-3 md:p-4 cursor-pointer outline-none">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200"><Info size={14} strokeWidth={2.5} /></div>
            <h4 className="text-xs font-black text-blue-800 uppercase tracking-wide">Panduan Sistem: Cara Membaca Persentase</h4>
          </div>
          <div className="w-6 h-6 rounded-full bg-blue-100/60 flex items-center justify-center text-blue-600 group-open:rotate-180 transition-transform duration-300"><ChevronDown size={14} /></div>
        </summary>
        <div className="px-4 pb-4 md:pl-[60px] md:pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] md:text-xs text-blue-700/90 font-medium leading-relaxed border-t border-blue-200/60 pt-3">
            <div>
              <strong className="text-blue-900 font-bold">  SLA (Argometer Waktu):</strong><br/>
              Menunjukkan sisa waktu target penyelesaian. Makin tinggi angka, makin dekat ke batas waktu.<br/>
              <span className="inline-block mt-1.5"><span className="bg-white border border-blue-200 px-1.5 py-0.5 rounded font-bold text-blue-600 shadow-sm">0%</span> = Baru Masuk</span> 
              <span className="inline-block mt-1.5 ml-2"><span className="bg-red-100 border border-red-200 px-1.5 py-0.5 rounded font-bold text-red-600 shadow-sm">100%</span> = Lewat Target (Overdue)</span>
            </div>
            <div className="border-t md:border-t-0 md:border-l border-blue-200/60 pt-2 md:pt-0 md:pl-4">
              <strong className="text-blue-900 font-bold">  Progress (Pengerjaan):</strong><br/>
              Menunjukkan tahapan fisik pekerjaan di lapangan yang diperbarui secara manual oleh tim PIC.<br/>
              <span className="inline-block mt-1.5 bg-white border border-blue-200 px-2 py-0.5 rounded shadow-sm">Status: Request &rarr; In Progress &rarr; Selesai</span>
            </div>
          </div>
        </div>
      </details>

      <div className="w-full">
        <h3 className="text-sm font-bold text-slate-800 mb-3 md:hidden">Live Progress Board</h3>
        
        <div className="md:hidden flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
          {recentTickets.map((ticket, idx) => (
            <div key={idx} onClick={() => { setSelectedUrgentTicket(ticket); setActiveContextList(recentTickets); }} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 cursor-pointer active:scale-95 transition-all hover:border-indigo-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">{ticket.id}</span>
                <span className={`px-2 py-1 border text-[9px] font-black rounded ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-bold w-12">Progress</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${ticket.progress}%` }} className={`h-full rounded-full ${getBarColor(ticket.status)}`}></motion.div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 w-6 text-right">{ticket.progress}%</span>
                </div>
              </div>
            </div>
          ))}
          {recentTickets.length === 0 && <div className="text-center p-6 text-slate-400 font-medium text-xs border border-dashed rounded-xl">Belum ada tugas aktif</div>}
        </div>

        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2"><Clock size={14} className="text-amber-500" /> Live Progress Board (Sedang Dikerjakan)</h3>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[350px] custom-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">No. Request</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Progress</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">SLA Timeline</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">PIC Assignment</th>
                </tr>
              </thead>
             <tbody className="divide-y divide-slate-100">
                {recentTickets.map((ticket, idx) => (
                  <tr key={idx} onClick={() => { setSelectedUrgentTicket(ticket); setActiveContextList(recentTickets); }} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">{ticket.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 w-full">
                        <span className={`px-2 py-1 border text-[9px] font-black rounded w-24 text-center ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${ticket.progress}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${getBarColor(ticket.status)}`}></motion.div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 w-8">{ticket.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${ticket.sla}%` }} transition={{ duration: 1, delay: 0.2 }} className={`h-full rounded-full ${ticket.sla === 100 && ticket.status !== "COMPLETED" ? "bg-red-500" : "bg-indigo-500"}`}></motion.div>
                        </div>
                        <span className={`text-[10px] font-bold w-8 ${ticket.sla === 100 && ticket.status !== "COMPLETED" ? "text-red-500" : "text-slate-500"}`}>{ticket.sla}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-bold text-slate-600">PIC {ticket.pic}</span>
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 relative"><User size={12} /></div>
                      </div>
                    </td>
                  </tr>
                ))}
                {recentTickets.length === 0 && (
                  <tr><td colSpan={4} className="text-center p-8 text-slate-400 font-medium text-xs">Belum ada tugas aktif (In Progress)</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          
          <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col min-h-[220px] relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-2xl"></div>
            <div className="flex items-center justify-between mb-3 pl-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1.5"><AlertCircle size={14} /> SLA Kritis</h3>
                {criticalTickets.length > 0 && (
                  <button onClick={() => setShowCriticalList(true)} className="px-2 py-0.5 bg-red-100 text-red-700 hover:bg-red-200 text-[9px] font-black rounded-md border border-red-200 shadow-sm transition-colors cursor-pointer active:scale-95">
                    Lihat Semua ({criticalTickets.length})
                  </button>
                )}
              </div>
              {urgentTicket && urgentTicket.sla >= 80 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </div>
            {urgentTicket ? (
              <div className="flex-1 flex flex-col justify-center pl-2">
                <div onClick={() => { setSelectedUrgentTicket(urgentTicket); setActiveContextList(criticalTickets); }} className="cursor-pointer hover:shadow-md transition-all bg-gradient-to-br from-red-50/50 to-white border border-red-100 p-4 rounded-xl flex flex-col gap-3">
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded-md">{urgentTicket.id}</span>
                      <span className="text-[9px] text-slate-500 font-bold">{urgentTicket.date}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug mb-3">{urgentTicket.title}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Tags size={10} /> {urgentTicket.category}</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1"><User size={10} /> PIC: {urgentTicket.pic}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-red-100/50 mt-auto">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-bold text-slate-500">SLA: <span className="text-red-600 font-black">{urgentTicket.sla}%</span></span>
                      <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-md border ${getStatusColor(urgentTicket.status)}`}>{urgentTicket.status}</span>
                    </div>
                    <div className="w-full h-1.5 bg-red-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(urgentTicket.sla, 100)}%` }} className={`h-full ${urgentTicket.sla >= 80 ? "bg-red-500" : "bg-red-400"}`}></motion.div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl p-4 ml-2">
                <span className="text-[10px] font-medium text-slate-400">Tidak ada tiket SLA kritis. Aman! </span>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col min-h-[220px] relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-2xl"></div>
            <div className="flex items-center justify-between mb-3 pl-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><Clock size={14} /> Tiket Masuk Terbaru</h3>
                {latestTickets.length > 0 && (
                  <button onClick={() => setShowLatestList(true)} className="px-2 py-0.5 bg-blue-100 text-blue-700 hover:bg-blue-200 text-[9px] font-black rounded-md border border-blue-200 shadow-sm transition-colors cursor-pointer active:scale-95">
                    Lihat Semua ({latestTickets.length})
                  </button>
                )}
              </div>
              {newestTicket && newestTicket.status === 'REQUEST' && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </div>
            {newestTicket ? (
              <div className="flex-1 flex flex-col justify-center pl-2">
                <div onClick={() => { setSelectedUrgentTicket(newestTicket); setActiveContextList(latestTickets); }} className="cursor-pointer hover:shadow-md transition-all bg-gradient-to-br from-blue-50/50 to-white border border-blue-100 p-4 rounded-xl flex flex-col gap-3">
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-md">{newestTicket.id}</span>
                      <span className="text-[9px] text-slate-500 font-bold">{newestTicket.date}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug mb-3">{newestTicket.title}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Tags size={10} /> {newestTicket.category}</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1"><User size={10} /> PIC: {newestTicket.pic}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-blue-100/50 mt-auto">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-bold text-slate-500">Status Awal: <span className="text-blue-600 font-black">{newestTicket.progress}% Berjalan</span></span>
                      <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-md border ${getStatusColor(newestTicket.status)}`}>{newestTicket.status}</span>
                    </div>
                    <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(newestTicket.progress, 15)}%` }} className={`h-full bg-blue-500`}></motion.div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl p-4 ml-2">
                <span className="text-[10px] font-medium text-slate-400">Belum ada tiket masuk baru.</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[300px]">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Completion Tracking</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8 flex-1">
            <div className="relative w-28 h-28 md:w-32 md:h-32 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
                <motion.circle cx="50" cy="50" r={radius} fill="none" stroke="#10b981" strokeWidth="14" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - doneStroke }} transition={{ duration: 1.5, ease: "easeOut" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800 leading-none">{completed}</span>
                <span className="text-[10px] font-bold text-slate-500">Selesai</span>
              </div>
            </div>
            <div className="space-y-3 w-full sm:w-auto text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-xs font-bold text-slate-600">Completed ({donePercentage}%)</span></div>
              <div className="flex items-center justify-center sm:justify-start gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span><span className="text-xs font-bold text-slate-600">On Progress ({progressPercentage}%)</span></div>
              <div className="flex items-center justify-center sm:justify-start gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-xs font-bold text-slate-600">Request Baru ({requestPercentage}%)</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* --- LEADERBOARD SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-amber-50/50 rotate-12 pointer-events-none">
            <Trophy size={100} strokeWidth={3} />
          </div>
          <div className="flex items-center gap-2 mb-4 relative z-10">
            <Trophy size={16} className="text-amber-500" />
            <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Top 5 Pemohon Paling Aktif</h3>
          </div>
          <div className="space-y-2 relative z-10">
            {topRequesters.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-white/60 backdrop-blur-sm rounded-xl border border-amber-50 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-400 text-white shadow-sm' : idx === 1 ? 'bg-slate-300 text-white shadow-sm' : idx === 2 ? 'bg-orange-300 text-white shadow-sm' : 'bg-slate-50 text-slate-500'}`}>
                    {idx + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[150px] sm:max-w-[200px]">{item.name}</span>
                </div>
                <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-md shrink-0">{item.count} Tiket</span>
              </div>
            ))}
            {topRequesters.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4">Belum ada data tiket.</p>}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-emerald-50/50 rotate-12 pointer-events-none">
            <MapPin size={100} strokeWidth={3} />
          </div>
          <div className="flex items-center gap-2 mb-4 relative z-10">
            <MapPin size={16} className="text-emerald-500" />
            <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Top 5 Cabang / Unit Teraktif</h3>
          </div>
          <div className="space-y-2 relative z-10">
            {topBranches.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-50 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-emerald-400 text-white shadow-sm' : idx === 1 ? 'bg-slate-300 text-white shadow-sm' : idx === 2 ? 'bg-orange-300 text-white shadow-sm' : 'bg-slate-50 text-slate-500'}`}>
                    {idx + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[150px] sm:max-w-[200px]">{item.name}</span>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md shrink-0">{item.count} Tiket</span>
              </div>
            ))}
            {topBranches.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4">Belum ada data tiket.</p>}
          </div>
        </div>
      </div>

      {userRole !== "PIC_LOGISTIK" && (
        <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm marker:content-[''] mt-4">
          <summary className="flex items-center justify-between p-4 md:p-5 cursor-pointer list-none outline-none">
            <div className="flex items-center gap-3"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div><h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Detail Beban Kerja PIC</h3></div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 group-open:rotate-180 transition-all"><ChevronDown size={16} className="text-slate-500" /></div>
          </summary>
          <div className="p-4 md:p-6 border-t border-slate-100">
            {renderPICGroup("Tim P3 (Pemeliharaan & Aset)", picWorkload.P3)}
            {renderPICGroup("Tim Pengadaan", picWorkload.Pengadaan)}
            {renderPICGroup("Tim Pembayaran", picWorkload.Pembayaran)}
            {renderPICGroup("PIC Lainnya", picWorkload.Lainnya)}
          </div>
        </details>
      )}

      {/* MODAL 1: DAFTAR SEMUA TIKET KRITIS */}
      <AnimatePresence>
        {showCriticalList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-red-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-red-50 flex items-center justify-between bg-red-50/50 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-600"/>
                  <h3 className="font-black text-red-700">Daftar Tiket SLA Kritis ({criticalTickets.length})</h3>
                </div>
                <button onClick={() => setShowCriticalList(false)} className="text-red-400 hover:text-red-600 transition-colors"><X size={20}/></button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                {criticalTickets.map((ticket, idx) => (
                   <div key={idx} onClick={() => { setShowCriticalList(false); setSelectedUrgentTicket(ticket); setActiveContextList(criticalTickets); }} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-red-200 hover:shadow-md cursor-pointer transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-md">{ticket.id}</span>
                        <span className="text-[10px] text-red-600 font-bold">SLA: {ticket.sla}%</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{ticket.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">PIC: <span className="font-bold text-slate-700">{ticket.picName}</span></p>
                   </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: DAFTAR SEMUA TIKET TERBARU */}
      <AnimatePresence>
        {showLatestList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-blue-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-50 flex items-center justify-between bg-blue-50/50 shrink-0">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-blue-600"/>
                  <h3 className="font-black text-blue-700">Daftar Tiket Terbaru Masuk ({latestTickets.length})</h3>
                </div>
                <button onClick={() => setShowLatestList(false)} className="text-blue-400 hover:text-blue-600 transition-colors"><X size={20}/></button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                {latestTickets.map((ticket, idx) => (
                   <div key={idx} onClick={() => { setShowLatestList(false); setSelectedUrgentTicket(ticket); setActiveContextList(latestTickets); }} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md cursor-pointer transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md">{ticket.id}</span>
                        <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-md border ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{ticket.title}</h4>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] text-slate-500">PIC: <span className="font-bold text-slate-700">{ticket.picName}</span></p>
                        <span className="text-[9px] text-slate-500 font-bold">{ticket.date}</span>
                      </div>
                   </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DETAIL TIKET & ACTIONS DENGAN FILTERING ROLE */}
      <AnimatePresence>
        {selectedUrgentTicket && !showCriticalList && !showLatestList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden relative">
              
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-800">Detail Progress Tiket</h3>
                  <span className="ml-2 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {currentIndex >= 0 ? `${currentIndex + 1} of ${activeContextList.length}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <button 
                      onClick={() => hasPrev && setSelectedUrgentTicket(activeContextList[currentIndex - 1])}
                      disabled={!hasPrev} 
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronLeft size={16}/>
                    </button>
                    <div className="w-[1px] h-4 bg-slate-200"></div>
                    <button 
                      onClick={() => hasNext && setSelectedUrgentTicket(activeContextList[currentIndex + 1])}
                      disabled={!hasNext} 
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <ChevronRight size={16}/>
                    </button>
                  </div>
                  <button onClick={() => setSelectedUrgentTicket(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-black rounded-lg">{selectedUrgentTicket.id}</span>
                      <span className="text-xs text-slate-500 font-bold">{selectedUrgentTicket.date}</span>
                  </div>
                  <div>
                      <h4 className="text-base font-black text-slate-800 mb-2">{selectedUrgentTicket.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                         <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded flex items-center gap-1.5"><Tags size={12} /> {selectedUrgentTicket.category}</span>
                         <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded flex items-center gap-1.5"><User size={12} /> PIC: {selectedUrgentTicket.picName}</span>
                      </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500">Timeline SLA (Tenggat): <span className={`${selectedUrgentTicket.sla >= 80 ? 'text-red-600' : 'text-indigo-600'} font-black`}>{selectedUrgentTicket.sla}% Berjalan</span></span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative mb-4">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(selectedUrgentTicket.sla, 100)}%` }} className={`absolute top-0 left-0 h-full ${selectedUrgentTicket.sla >= 80 ? 'bg-red-500' : 'bg-indigo-500'}`}></motion.div>
                      </div>
                      
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500">Progress Pengerjaan: <span className="text-slate-700 font-black">{selectedUrgentTicket.progress}%</span></span>
                          <span className={`px-2 py-1 text-[10px] font-black rounded-md border ${getStatusColor(selectedUrgentTicket.status)}`}>{selectedUrgentTicket.status}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(selectedUrgentTicket.progress, 100)}%` }} className={`absolute top-0 left-0 h-full ${getBarColor(selectedUrgentTicket.status)}`}></motion.div>
                      </div>
                  </div>

                  {userRole !== 'PIC_LOGISTIK' && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Tindakan Cepat (Follow Up PIC)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleFollowUpWA(selectedUrgentTicket)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 hover:shadow-sm transition-all text-xs">
                          <MessageCircle size={14} /> WhatsApp PIC
                        </button>
                        <button onClick={() => handleFollowUpTeams(selectedUrgentTicket)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-xl hover:bg-blue-100 hover:shadow-sm transition-all text-xs">
                          <Mail size={14} /> Teams PIC
                        </button>
                      </div>
                      <button 
                        onClick={() => router.push(`/tickets/${selectedUrgentTicket.id}`)}
                        className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-xs border border-slate-200"
                      >
                        Lihat Detail Tiket <ExternalLink size={12} />
                      </button>
                    </div>
                  )}

                  {userRole === 'PIC_LOGISTIK' && (
                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => router.push(`/tickets/${selectedUrgentTicket.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black rounded-xl hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800 transition-all text-sm"
                      >
                        Buka Detail Lengkap & Proses <ExternalLink size={16} />
                      </button>
                      <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">Klik untuk masuk ke halaman pengerjaan / update tiket.</p>
                    </div>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}