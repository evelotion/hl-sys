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
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring" as const, stiffness: 350, damping: 28 } 
    }
  };

  return (
    <div className="space-y-8">
      <motion.header 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="pb-2"
      >
        <h2 className="text-xl font-bold text-slate-800 tracking-wide">Dashboard Operasional</h2>
        <p className="text-slate-500 mt-1 font-medium text-xs">Monitoring Hotline Layanan Logistik Terpusat</p>
      </motion.header>

      {/* Premium Glassmorphism Cards with 3D Shadow */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { title: 'Total Request', value: totalRequest, icon: <Inbox size={18} />, bg: 'bg-white', iconBg: 'bg-slate-50', text: 'text-slate-600' },
          { title: 'On Progress', value: onProgress, icon: <Activity size={18} />, bg: 'bg-white', iconBg: 'bg-blue-50', text: 'text-blue-600' },
          { title: 'Completed', value: completed, icon: <CheckCircle size={18} />, bg: 'bg-white', iconBg: 'bg-emerald-50', text: 'text-emerald-600' },
          { title: 'SLA On Time', value: `${slaOnTime}%`, icon: <Clock size={18} />, bg: 'bg-white', iconBg: 'bg-indigo-50', text: 'text-indigo-600' },
        ].map((kpi, idx) => (
          <motion.div 
            key={idx} 
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.02 }}
            className="bg-white/80 backdrop-blur-2xl p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 relative group overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${kpi.iconBg} rounded-full blur-3xl opacity-0 group-hover:opacity-70 transition-opacity duration-500 -mr-12 -mt-12 pointer-events-none`}></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className={`p-3 ${kpi.iconBg} ${kpi.text} rounded-2xl shadow-sm border border-white group-hover:scale-110 transition-transform duration-300`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">{kpi.title}</p>
                <p className="text-xl font-bold text-slate-800 tracking-tight">{kpi.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Workload Section with Sleeker UI */}
      {userRole !== 'PIC_LOGISTIK' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/70 backdrop-blur-2xl p-6 md:p-8 rounded-[24px] border border-white/80 shadow-[0_10px_40px_rgb(0,0,0,0.03)]"
        >
          <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
            <AlertCircle size={16} className="text-indigo-500"/> Visibilitas Beban Kerja PIC
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {picWorkload.map((pic, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.9)" }}
                className="flex justify-between items-center p-4 bg-white/60 rounded-2xl border border-slate-100 shadow-sm hover:shadow-[0_8px_20px_rgb(0,0,0,0.04)] transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-white flex items-center justify-center text-slate-600 font-bold text-xs shadow-inner">
                    {pic.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-slate-700 text-sm">{pic.name}</span>
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span className="text-blue-600 bg-blue-50/80 px-3 py-1.5 rounded-lg font-semibold border border-blue-100/50 shadow-sm">{pic.activeTasks} Diproses</span>
                  <span className="text-emerald-600 bg-emerald-50/80 px-3 py-1.5 rounded-lg font-semibold border border-emerald-100/50 shadow-sm">{pic.completed} Selesai</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}