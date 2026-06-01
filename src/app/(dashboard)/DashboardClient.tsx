// hl-sys/src/app/(dashboard)/DashboardClient.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, CheckCircle, AlertCircle, Inbox } from 'lucide-react';

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
  
  // Variabel animasi untuk efek stagger (muncul berurutan)
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring" as const, stiffness: 300, damping: 24 } 
    }
  };

  return (
    <div className="space-y-8">
      <motion.header 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Operasional</h2>
        <p className="text-slate-500 mt-1 font-medium text-sm">Monitoring Hotline Layanan Logistik Terpusat</p>
      </motion.header>

      {/* Light Premium KPI Cards */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-5"
      >
        {[
          { title: 'Total Request', value: totalRequest, icon: <Inbox size={20} />, bg: 'bg-slate-50', text: 'text-slate-600' },
          { title: 'On Progress', value: onProgress, icon: <Activity size={20} />, bg: 'bg-blue-50', text: 'text-blue-600' },
          { title: 'Completed', value: completed, icon: <CheckCircle size={20} />, bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { title: 'SLA On Time', value: `${slaOnTime}%`, icon: <Clock size={20} />, bg: 'bg-indigo-50', text: 'text-indigo-600' },
        ].map((kpi, idx) => (
          <motion.div 
            key={idx} 
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.01 }}
            className="bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 relative group overflow-hidden"
          >
            {/* Soft Glow on Hover */}
            <div className={`absolute top-0 right-0 w-24 h-24 ${kpi.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 -mr-8 -mt-8 pointer-events-none`}></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className={`p-3 ${kpi.bg} ${kpi.text} rounded-xl border border-white shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{kpi.title}</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">{kpi.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Workload Section with Light Glassmorphism - HANYA MUNCUL JIKA BUKAN PIC */}
      {userRole !== 'PIC_LOGISTIK' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/50 backdrop-blur-2xl p-6 md:p-8 rounded-[24px] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
        >
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <AlertCircle size={18} className="text-blue-500"/> Visibilitas Beban Kerja PIC
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {picWorkload.map((pic, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.01 }}
                className="flex justify-between items-center p-4 bg-white/80 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                    {pic.name.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-700 text-sm">{pic.name}</span>
                </div>
                <div className="flex gap-2 text-[11px]">
                  <span className="text-blue-700 bg-blue-50 px-3 py-1 rounded-lg font-bold border border-blue-100">{pic.activeTasks} Diproses</span>
                  <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg font-bold border border-emerald-100">{pic.completed} Selesai</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}