// hl-sys/src/app/(dashboard)/DashboardClient.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, CheckCircle, AlertCircle, Inbox, ArrowUpRight, ChevronDown } from 'lucide-react';

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
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } }
  };

  return (
    <div className="space-y-8">
      <motion.header 
        initial={{ opacity: 0, x: -20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ duration: 0.5 }}
        className="flex items-end justify-between border-b border-slate-200/60 pb-4"
      >
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Overview</h2>
          <p className="text-slate-500 mt-1 font-medium text-xs">Sistem Terpadu Logistik & Alih Daya</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          System Online
        </div>
      </motion.header>

      {/* Bento Grid Layout */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-5"
      >
        {/* Main Big KPI */}
        <motion.div 
          variants={itemVariants}
          className="md:col-span-2 lg:col-span-4 bg-white/90 backdrop-blur-xl p-6 rounded-[24px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50 group-hover:scale-110 transition-transform duration-300">
              <Inbox size={20} />
            </div>
            <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </div>
          <div>
            <p className="text-5xl font-black text-slate-800 tracking-tighter">{totalRequest}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Total Request</p>
          </div>
        </motion.div>

        {/* Medium KPIs */}
        <motion.div 
          variants={itemVariants}
          className="md:col-span-2 lg:col-span-4 bg-white/90 backdrop-blur-xl p-6 rounded-[24px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle size={20} />
            </div>
          </div>
          <div>
            <p className="text-5xl font-black text-slate-800 tracking-tighter">{completed}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Tugas Selesai</p>
          </div>
        </motion.div>

        {/* Small KPIs stacked */}
        <div className="md:col-span-4 lg:col-span-4 grid grid-rows-2 gap-5">
          <motion.div 
            variants={itemVariants}
            className="bg-white/90 backdrop-blur-xl p-5 rounded-[20px] border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center justify-between group transition-all"
          >
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Sedang Diproses</p>
              <p className="text-2xl font-black text-slate-800">{onProgress}</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl border border-amber-100/50 group-hover:scale-110 transition-transform">
              <Activity size={20} />
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="bg-white/90 backdrop-blur-xl p-5 rounded-[20px] border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center justify-between group transition-all"
          >
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">SLA Ketepatan Waktu</p>
              <p className="text-2xl font-black text-slate-800">{slaOnTime}%</p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl border border-blue-100/50 group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Workload Section - Dropdown / Accordion */}
      {userRole !== 'PIC_LOGISTIK' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white/80 backdrop-blur-2xl p-6 md:p-8 rounded-[24px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <details className="group marker:content-['']">
            <summary className="flex items-center justify-between cursor-pointer list-none outline-none">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.6)]"></div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Detail Beban Kerja PIC</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 group-open:rotate-180 transition-all duration-500 shadow-sm">
                <ChevronDown size={16} className="text-slate-500" />
              </div>
            </summary>
            
            <div className="pt-6 mt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 fade-in duration-500">
              {picWorkload.map((pic, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="flex justify-between items-center p-4 bg-white/60 backdrop-blur-md rounded-xl border border-white shadow-sm hover:shadow-[0_8px_20px_rgb(0,0,0,0.04)] transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200/50 flex items-center justify-center text-indigo-700 font-black text-sm shadow-inner">
                      {pic.name.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">{pic.name}</span>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-slate-600 bg-white/80 px-3 py-1.5 rounded-lg font-bold border border-slate-200/60 shadow-sm">{pic.activeTasks} Antrean</span>
                    <span className="text-emerald-700 bg-emerald-50/80 px-3 py-1.5 rounded-lg font-bold border border-emerald-100/60 shadow-sm">{pic.completed} Selesai</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </details>
        </motion.div>
      )}
    </div>
  );
}