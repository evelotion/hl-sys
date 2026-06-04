// hl-sys/src/app/(dashboard)/DashboardClient.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle2, Timer, ChevronDown, User } from 'lucide-react';

interface PICWorkload {
  name: string;
  activeTasks: number;
  completed: number;
}

export default function DashboardClient({ 
  totalRequest, onProgress, completed, slaOnTime, picWorkload, userRole
}: {
  totalRequest: number;
  onProgress: number;
  completed: number;
  slaOnTime: number;
  picWorkload: PICWorkload[];
  userRole: string; 
}) {
  
  // Kalkulasi Persentase untuk Chart
  const safeTotal = totalRequest === 0 ? 1 : totalRequest;
  const donePercentage = totalRequest === 0 ? 0 : Math.round((completed / safeTotal) * 100);
  const progressPercentage = totalRequest === 0 ? 0 : Math.round((onProgress / safeTotal) * 100);

  // Rumus Keliling Lingkaran SVG untuk Donut Chart
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const doneStroke = (donePercentage / 100) * circumference;

  // Data Dummy untuk Tabel Progress (Bisa diganti dengan data asli dari database nanti)
  const recentTickets = [
    { id: 'LOG-2026-0001', status: 'ON PROGRESS', progress: 45, sla: 35, pic: 'IND' },
    { id: 'LOG-2026-0002', status: 'PROCESS', progress: 30, sla: 30, pic: 'IBL' },
    { id: 'LOG-2026-0003', status: 'COMPLETED', progress: 100, sla: 100, pic: 'NOV' },
    { id: 'LOG-2026-0004', status: 'ON PROGRESS', progress: 75, sla: 95, pic: 'MLK' },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'COMPLETED') return 'text-emerald-600 bg-emerald-50';
    if (status === 'ON PROGRESS') return 'text-amber-600 bg-amber-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getBarColor = (status: string) => {
    if (status === 'COMPLETED') return 'bg-emerald-500';
    if (status === 'ON PROGRESS') return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">MONITORING DASHBOARD</h2>
      </div>

      {/* 1. Barisan 4 KPI Sejajar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Request */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3">
            <FileText size={18} className="text-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Request</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-800">{totalRequest}</p>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">+12% vs bulan lalu</p>
          </div>
        </div>

        {/* On Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3">
            <Clock size={18} className="text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">On Progress</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-800">{onProgress}</p>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">+8% vs bulan lalu</p>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-800">{completed}</p>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">+15% vs bulan lalu</p>
          </div>
        </div>

        {/* SLA On Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-3">
            <Timer size={18} className="text-indigo-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">SLA On Time</span>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-800">{slaOnTime}%</p>
            <p className="text-[10px] text-emerald-500 font-bold mt-1">+3% vs bulan lalu</p>
          </div>
        </div>
      </div>

      {/* 2. Tabel Visual Monitoring */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                      <span className={`px-2 py-1 text-[9px] font-black rounded w-24 text-center ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${ticket.progress}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${getBarColor(ticket.status)}`}></motion.div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 w-8">{ticket.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${ticket.sla}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full rounded-full bg-indigo-500"></motion.div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 w-8">{ticket.sla}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-bold text-slate-600">PIC {ticket.pic}</span>
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 relative">
                        <User size={12} />
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white"></span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Barisan Bawah (Timeline & Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SLA Timeline Stepper */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">SLA Timeline</h3>
          <div className="flex items-center justify-between relative px-2">
            {/* Garis background */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0"></div>
            {/* Garis progress (Misal sampai ke tahap 3) */}
            <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 1.5 }} className="absolute top-1/2 left-0 h-1 bg-indigo-500 -translate-y-1/2 z-0"></motion.div>
            
            {['Request Masuk', 'Verifikasi', 'Proses', 'Monitoring', 'Selesai'].map((step, idx) => {
              const isPassed = idx <= 2; // Simulasi: Tahap 0,1,2 udah lewat
              const isCurrent = idx === 2;
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isPassed ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300'}`}>
                    {isPassed && idx !== 4 && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    {idx === 4 && <CheckCircle2 size={14} className={isPassed ? 'text-white' : 'text-slate-300'} />}
                  </div>
                  <span className={`text-[10px] font-bold ${isCurrent ? 'text-indigo-600' : 'text-slate-500'} absolute top-8 whitespace-nowrap`}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion Tracking Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Completion Tracking</h3>
          <div className="flex items-center justify-center gap-8">
            {/* Donut Chart */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
                <motion.circle cx="50" cy="50" r={radius} fill="none" stroke="#10b981" strokeWidth="14" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - doneStroke }} transition={{ duration: 1.5, ease: "easeOut" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800 leading-none">{completed}</span>
                <span className="text-[10px] font-bold text-slate-500">Selesai</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-slate-600">Completed ({donePercentage}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-xs font-bold text-slate-600">On Progress ({progressPercentage}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-xs font-bold text-slate-600">Process</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Dropdown Beban Kerja PIC (Tetap Dipertahankan untuk Bu Anne) */}
      {userRole !== 'PIC_LOGISTIK' && (
        <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm marker:content-['']">
          <summary className="flex items-center justify-between p-5 cursor-pointer list-none outline-none">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Detail Beban Kerja PIC</h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 group-open:rotate-180 transition-all">
              <ChevronDown size={16} className="text-slate-500" />
            </div>
          </summary>
          
          <div className="p-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            {picWorkload.map((pic, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                    {pic.name.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-700 text-xs">{pic.name}</span>
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span className="text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">{pic.activeTasks} Antrean</span>
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{pic.completed} Selesai</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}