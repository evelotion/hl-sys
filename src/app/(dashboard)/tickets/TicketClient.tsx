// hl-sys/src/app/(dashboard)/tickets/TicketClient.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Clock, AlertCircle, CheckCircle, ArrowDownUp, Tags } from 'lucide-react';
import { useRouter } from 'next/navigation';

const FilterButton = ({ label, value, currentFilter, onSelect }: { label: string, value: string, currentFilter: string, onSelect: (v: string) => void }) => {
  const isActive = currentFilter === value;
  return (
    <button 
      onClick={() => onSelect(value)}
      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 relative ${
        isActive ? 'text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
      }`}
    >
      {isActive && (
        <motion.div layoutId="activeFilter" className="absolute inset-0 bg-white border border-slate-200/60 rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.03)] -z-10" />
      )}
      {label}
    </button>
  );
};

export default function TicketClient({ initialTickets, userRole }: { initialTickets: any[]; userRole?: string; }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [sortOrder, setSortOrder] = useState('NEWEST'); 
  const router = useRouter();

  const processedTickets = useMemo(() => {
    let result = initialTickets;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.cabang.toLowerCase().includes(q) || t.pic.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q));
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(t => t.status === statusFilter);
    }
    result = [...result].sort((a, b) => sortOrder === 'NEWEST' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    return result;
  }, [initialTickets, search, statusFilter, sortOrder]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'OPEN': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100 shadow-sm"><AlertCircle size={12}/> Request</span>;
      case 'IN_PROGRESS': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold border border-amber-100 shadow-sm"><Clock size={12}/> Progress</span>;
      case 'DONE': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100 shadow-sm"><CheckCircle size={12}/> Selesai</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h2 className="text-xl font-bold text-slate-800 tracking-wide">Manajemen Tiket</h2>
          <p className="text-slate-500 mt-1 font-medium text-xs">Pantau dan kelola semua request logistik dari satu pintu.</p>
        </motion.div>
        
        {userRole !== 'PIC_LOGISTIK' && (
          <motion.button 
            onClick={() => router.push('/tickets/create')}
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl shadow-[0_8px_20px_rgb(79,70,229,0.3)] hover:shadow-[0_12px_25px_rgb(79,70,229,0.4)] transition-all text-sm"
          >
            <Plus size={16} strokeWidth={2.5} /> Buat Tiket
          </motion.button>
        )}
      </div>

      {/* Filter Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/80 backdrop-blur-2xl p-2.5 rounded-2xl border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col md:flex-row gap-3 items-center justify-between"
      >
        <div className="flex bg-slate-50/80 p-1 rounded-xl w-full md:w-auto overflow-x-auto border border-slate-100/50">
          <FilterButton label="Semua" value="ALL" currentFilter={statusFilter} onSelect={setStatusFilter} />
          <FilterButton label="Request" value="OPEN" currentFilter={statusFilter} onSelect={setStatusFilter} />
          <FilterButton label="Progress" value="IN_PROGRESS" currentFilter={statusFilter} onSelect={setStatusFilter} />
          <FilterButton label="Selesai" value="DONE" currentFilter={statusFilter} onSelect={setStatusFilter} />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID, Cabang, PIC..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-slate-700 font-medium"
            />
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
            className="p-2 bg-slate-50/50 border border-slate-200/50 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowDownUp size={14} /> <span className="hidden sm:inline">{sortOrder === 'NEWEST' ? 'Terbaru' : 'Terlama'}</span>
          </button>
        </div>
      </motion.div>

      {/* Premium Table */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/80 backdrop-blur-2xl rounded-3xl border border-white shadow-[0_10px_40px_rgb(0,0,0,0.04)] overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/40 border-b border-slate-200/40">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Tiket</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategori</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detail Masalah</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cabang</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">PIC</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {processedTickets.map((ticket) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => router.push(`/tickets/${ticket.originalId}`)}
                    key={ticket.originalId} 
                    className="border-b border-slate-100/50 hover:bg-slate-50/50 hover:shadow-[0_4px_15px_rgb(0,0,0,0.02)] transition-all duration-200 cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-semibold text-indigo-600 text-xs whitespace-nowrap">{ticket.ticketNumber}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-500 rounded-md text-[10px] font-semibold border border-slate-200/60 shadow-sm whitespace-nowrap">
                        <Tags size={10} /> {ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{ticket.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{ticket.date}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs font-semibold whitespace-nowrap">{ticket.cabang}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium whitespace-nowrap">{ticket.pic}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ticket.status)}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}