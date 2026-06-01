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
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 relative ${
        isActive ? 'text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
      }`}
    >
      {isActive && (
        <motion.div layoutId="activeFilter" className="absolute inset-0 bg-white border border-slate-200/60 rounded-xl shadow-sm -z-10" />
      )}
      {label}
    </button>
  );
};

// VVV Tambahin userRole di sini bro biar TS nggak error VVV
export default function TicketClient({ 
  initialTickets, 
  userRole 
}: { 
  initialTickets: any[]; 
  userRole?: string; 
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [sortOrder, setSortOrder] = useState('NEWEST'); 
  const router = useRouter();

  const processedTickets = useMemo(() => {
    let result = initialTickets;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || t.cabang.toLowerCase().includes(q) || t.pic.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(t => t.status === statusFilter);
    }

    result = [...result].sort((a, b) => {
      if (sortOrder === 'NEWEST') {
        return b.timestamp - a.timestamp; 
      } else {
        return a.timestamp - b.timestamp; 
      }
    });

    return result;
  }, [initialTickets, search, statusFilter, sortOrder]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'OPEN': return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-200/60 shadow-sm"><AlertCircle size={14}/> Request Masuk</span>;
      case 'IN_PROGRESS': return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200/60 shadow-sm"><Clock size={14}/> On Progress</span>;
      case 'DONE': return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200/60 shadow-sm"><CheckCircle size={14}/> Completed</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Manajemen Tiket</h2>
          <p className="text-slate-500 mt-1 font-medium">Pantau dan kelola semua request logistik dari satu pintu.</p>
        </motion.div>
        
        {/* VVV Tombol Buat Tiket kita hide kalau yang login PIC VVV */}
        {userRole !== 'PIC_LOGISTIK' && (
          <motion.button 
            onClick={() => router.push('/tickets/create')} // <-- Balikin routingnya yang sempet hilang
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] hover:shadow-[0_12px_24px_-8px_rgba(79,70,229,0.6)] transition-all"
          >
            <Plus size={18} strokeWidth={3} /> Buat Tiket
          </motion.button>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/50 backdrop-blur-xl p-3 rounded-2xl border border-white/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-3 items-center justify-between"
      >
        <div className="flex bg-slate-100/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          <FilterButton label="Semua" value="ALL" currentFilter={statusFilter} onSelect={setStatusFilter} />
          <FilterButton label="Request" value="OPEN" currentFilter={statusFilter} onSelect={setStatusFilter} />
          <FilterButton label="Progress" value="IN_PROGRESS" currentFilter={statusFilter} onSelect={setStatusFilter} />
          <FilterButton label="Selesai" value="DONE" currentFilter={statusFilter} onSelect={setStatusFilter} />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID, Cabang, PIC..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm text-slate-700 font-medium"
            />
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
            className="p-2.5 bg-white border border-slate-200/60 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center gap-2 text-sm font-bold"
          >
            <ArrowDownUp size={16} /> <span className="hidden sm:inline">{sortOrder === 'NEWEST' ? 'Terbaru' : 'Terlama'}</span>
          </button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/70 backdrop-blur-2xl rounded-3xl border border-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200/60">
                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">ID Tiket</th>
                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">Kategori</th>
                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">Deskripsi Masalah</th>
                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">Cabang</th>
                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">PIC</th>
                <th className="px-6 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {processedTickets.map((ticket) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => router.push(`/tickets/${ticket.originalId}`)}
                    key={ticket.originalId} 
                    className="border-b border-slate-100/50 hover:bg-white/90 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-5 font-extrabold text-indigo-600 whitespace-nowrap">{ticket.ticketNumber}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold border border-slate-200 whitespace-nowrap">
                        <Tags size={12} /> {ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-1">{ticket.title}</p>
                      <p className="text-xs text-slate-500 mt-1 font-semibold">{ticket.date}</p>
                    </td>
                    <td className="px-6 py-5 text-slate-700 font-bold whitespace-nowrap">{ticket.cabang}</td>
                    <td className="px-6 py-5 text-slate-600 font-semibold whitespace-nowrap">{ticket.pic}</td>
                    <td className="px-6 py-5 whitespace-nowrap">{getStatusBadge(ticket.status)}</td>
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