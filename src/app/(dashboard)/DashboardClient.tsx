// hl-sys/src/app/(dashboard)/DashboardClient.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle2, Timer, ChevronDown, User, Tags, AlertCircle } from 'lucide-react';

interface PICWorkloadData {
  name: string;
  initial: string;
  activeTasks: number;
  completed: number;
}

interface PICWorkloadGroup {
  P3: PICWorkloadData[];
  Pengadaan: PICWorkloadData[];
  Pembayaran: PICWorkloadData[];
  Lainnya: PICWorkloadData[];
}

interface TicketData {
  id: string;
  status: string;
  progress: number;
  sla: number;
  pic: string;
  title?: string;
  category?: string;
  cabang?: string;
  date?: string;
}

export default function DashboardClient({ 
  totalRequest, requestCount, onProgress, completed, slaOnTime, picWorkload, userRole, recentTickets, userName, urgentTicket
}: {
  totalRequest: number;
  requestCount: number; 
  onProgress: number;
  completed: number;
  slaOnTime: number;
  picWorkload: PICWorkloadGroup;
  userRole: string; 
  recentTickets: TicketData[]; 
  userName: string;
  urgentTicket?: TicketData | null; 
}) {
  
  const safeTotal = totalRequest === 0 ? 1 : totalRequest;
  const donePercentage = totalRequest === 0 ? 0 : Math.round((completed / safeTotal) * 100);
  const progressPercentage = totalRequest === 0 ? 0 : Math.round((onProgress / safeTotal) * 100);
  const requestPercentage = totalRequest === 0 ? 0 : Math.round((requestCount / safeTotal) * 100); 

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const doneStroke = (donePercentage / 100) * circumference;

  const latestTicket = recentTickets.length > 0 ? recentTickets[0] : null;

  const [greeting, setGreeting] = useState('Selamat Datang');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setGreeting('Selamat Pagi');
    else if (hour < 15) setGreeting('Selamat Siang');
    else if (hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'COMPLETED') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (status === 'ON PROGRESS') return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-blue-600 bg-blue-50 border-blue-100';
  };

  const getBarColor = (status: string) => {
    if (status === 'COMPLETED') return 'bg-emerald-500';
    if (status === 'ON PROGRESS') return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const firstName = userName ? userName.split(' ')[0] : 'Guest';

  // Helper untuk merender list PIC
  const renderPICGroup = (title: string, data: PICWorkloadData[]) => {
    if (data.length === 0) return null;
    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {data.map((pic, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                  {pic.initial}
                </div>
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

  return (
    <div className="space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          {greeting}, <span className="text-indigo-600">{firstName}</span>! 👋
        </h1>
        <p className="text-slate-500 mt-1 font-medium text-xs md:text-sm">Berikut adalah ringkasan performa sistem logistik hari ini.</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3">
            <FileText size={18} className="text-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Request</span>
          </div>
          <div><p className="text-3xl md:text-4xl font-black text-slate-800">{totalRequest}</p></div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3">
            <Clock size={18} className="text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">On Progress</span>
          </div>
          <div><p className="text-3xl md:text-4xl font-black text-slate-800">{onProgress}</p></div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
          </div>
          <div><p className="text-3xl md:text-4xl font-black text-slate-800">{completed}</p></div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3">
            <Timer size={18} className="text-indigo-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">SLA On Time</span>
          </div>
          <div><p className="text-3xl md:text-4xl font-black text-slate-800">{slaOnTime}%</p></div>
        </div>
      </div>

      <div className="w-full">
        <h3 className="text-sm font-bold text-slate-800 mb-3 md:hidden">Tiket Berjalan</h3>
        <div className="md:hidden flex flex-col gap-3">
          {recentTickets.map((ticket, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">No. Request</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Progress</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">SLA Timeline</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">PIC Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((ticket, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
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
                          <motion.div initial={{ width: 0 }} animate={{ width: `${ticket.sla}%` }} transition={{ duration: 1, delay: 0.2 }} className={`h-full rounded-full ${ticket.sla === 100 && ticket.status !== 'COMPLETED' ? 'bg-red-500' : 'bg-indigo-500'}`}></motion.div>
                        </div>
                        <span className={`text-[10px] font-bold w-8 ${ticket.sla === 100 && ticket.status !== 'COMPLETED' ? 'text-red-500' : 'text-slate-500'}`}>{ticket.sla}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-bold text-slate-600">PIC {ticket.pic}</span>
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 relative">
                          <User size={12} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {recentTickets.length === 0 && (
                  <tr><td colSpan={4} className="text-center p-8 text-slate-400 font-medium text-xs">Belum ada tugas aktif</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* IMPROVE POIN 9: Perbaikan UI Kartu Kepotong (Hilangkan overflow-hidden & h-full yg strict) */}
        <div className="flex flex-col gap-4">
          <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col min-h-[220px] relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-2xl"></div>
            <div className="flex items-center justify-between mb-3 pl-2">
              <h3 className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle size={14}/> Butuh Perhatian (SLA Kritis)
              </h3>
              {urgentTicket && urgentTicket.sla >= 80 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </div>
            
            {urgentTicket ? (
              <div className="flex-1 flex flex-col justify-center pl-2">
                 <div className="bg-gradient-to-br from-red-50/50 to-white border border-red-100 p-4 rounded-xl flex flex-col gap-3">
                   <div>
                     <div className="flex justify-between items-start gap-3 mb-2">
                       <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded-md">{urgentTicket.id}</span>
                       <span className="text-[9px] text-slate-500 font-bold">{urgentTicket.date}</span>
                     </div>
                     <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug mb-3">{urgentTicket.title}</h4>
                     <div className="flex items-center gap-2 flex-wrap">
                       <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Tags size={10} /> {urgentTicket.category}</span>
                       <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">📍 {urgentTicket.cabang}</span>
                     </div>
                   </div>
                   <div className="pt-3 border-t border-red-100/50 mt-auto">
                     <div className="flex justify-between items-center mb-1.5">
                       <span className="text-[9px] font-bold text-slate-500">SLA: <span className="text-red-600 font-black">{urgentTicket.sla}%</span></span>
                       <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-md border ${getStatusColor(urgentTicket.status)}`}>{urgentTicket.status}</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                       <motion.div initial={{ width: 0 }} animate={{ width: `${urgentTicket.progress}%` }} className={`h-full ${getBarColor(urgentTicket.status)}`}></motion.div>
                       <motion.div initial={{ width: 0 }} animate={{ width: `${urgentTicket.sla}%` }} className={`h-full ${urgentTicket.sla > 80 ? 'bg-red-500' : 'bg-red-300'}`}></motion.div>
                     </div>
                   </div>
                 </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl p-4 ml-2">
                 <span className="text-[10px] font-medium text-slate-400">Tidak ada tiket SLA kritis. Aman! 🎉</span>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col min-h-[220px] relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l-2xl"></div>
            <div className="flex items-center justify-between mb-3 pl-2">
              <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={14}/> Tiket Terbaru Masuk
              </h3>
            </div>
            
            {latestTicket ? (
              <div className="flex-1 flex flex-col justify-center pl-2">
                 <div className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 p-4 rounded-xl flex flex-col gap-3">
                   <div>
                     <div className="flex justify-between items-start gap-3 mb-2">
                       <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-md">{latestTicket.id}</span>
                       <span className="text-[9px] text-slate-500 font-bold">{latestTicket.date}</span>
                     </div>
                     <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug mb-3">{latestTicket.title}</h4>
                     <div className="flex items-center gap-2 flex-wrap">
                       <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Tags size={10} /> {latestTicket.category}</span>
                       <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">📍 {latestTicket.cabang}</span>
                     </div>
                   </div>
                   <div className="pt-3 border-t border-indigo-100/50 mt-auto">
                     <div className="flex justify-between items-center mb-1.5">
                       <span className="text-[9px] font-bold text-slate-500">SLA: <span className="text-indigo-600 font-black">{latestTicket.sla}%</span></span>
                       <span className={`px-1.5 py-0.5 text-[8px] font-black rounded-md border ${getStatusColor(latestTicket.status)}`}>{latestTicket.status}</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                       <motion.div initial={{ width: 0 }} animate={{ width: `${latestTicket.progress}%` }} className={`h-full ${getBarColor(latestTicket.status)}`}></motion.div>
                       <motion.div initial={{ width: 0 }} animate={{ width: `${latestTicket.sla}%` }} className="h-full bg-indigo-300 opacity-50"></motion.div>
                     </div>
                   </div>
                 </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl p-4 ml-2">
                 <span className="text-[10px] font-medium text-slate-400">Belum ada tiket baru masuk.</span>
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
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-xs font-bold text-slate-600">Completed ({donePercentage}%)</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span><span className="text-xs font-bold text-slate-600">On Progress ({progressPercentage}%)</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-xs font-bold text-slate-600">Request Baru ({requestPercentage}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IMPROVE POIN 7: Dropdown Beban Kerja PIC Disusun Berdasarkan Kategori */}
      {userRole !== 'PIC_LOGISTIK' && (
        <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm marker:content-[''] mt-4">
          <summary className="flex items-center justify-between p-4 md:p-5 cursor-pointer list-none outline-none">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Detail Beban Kerja PIC</h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 group-open:rotate-180 transition-all">
              <ChevronDown size={16} className="text-slate-500" />
            </div>
          </summary>
          <div className="p-4 md:p-6 border-t border-slate-100">
            {renderPICGroup('Tim P3 (Pemeliharaan & Aset)', picWorkload.P3)}
            {renderPICGroup('Tim Pengadaan', picWorkload.Pengadaan)}
            {renderPICGroup('Tim Pembayaran', picWorkload.Pembayaran)}
            {renderPICGroup('PIC Lainnya', picWorkload.Lainnya)}
          </div>
        </details>
      )}
    </div>
  );
}