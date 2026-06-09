// hl-sys/src/app/(dashboard)/tickets/TicketClient.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Clock, AlertCircle, CheckCircle, ArrowDownUp, Tags, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

const FilterButton = ({ label, value, currentFilter, onSelect }: { label: string, value: string, currentFilter: string, onSelect: (v: string) => void }) => {
  const isActive = currentFilter === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 relative whitespace-nowrap ${
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
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  // --- STATE SORTING BARU ---
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  
  // --- STATE PAGINATION BARU ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

  const router = useRouter();

  // --- FUNGSI KLIK HEADER UNTUK SORTING ---
  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction: direction as 'asc' | 'desc' });
  };

  const processedTickets = useMemo(() => {
    let result = initialTickets;
    
    // Filter by Search Text
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.cabang.toLowerCase().includes(q) || t.pic.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q));
    }
    
    // Filter by Status
    if (statusFilter !== 'ALL') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Filter by Kategori
    if (categoryFilter !== 'ALL') {
      result = result.filter(t => t.category === categoryFilter);
    }

    // Sort by Kolom Dinamis
    result = [...result].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [initialTickets, search, statusFilter, categoryFilter, sortConfig]);

  // Reset ke halaman 1 kalau user ganti filter, sort, atau ngetik pencarian
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, categoryFilter, sortConfig]);

  // Hitung total halaman & potong data sesuai halaman saat ini
  const totalPages = Math.ceil(processedTickets.length / itemsPerPage);
  const paginatedTickets = processedTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'OPEN': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100 shadow-sm"><AlertCircle size={12}/> Request</span>;
      case 'IN_PROGRESS': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold border border-amber-100 shadow-sm"><Clock size={12}/> Progress</span>;
      case 'DONE': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100 shadow-sm"><CheckCircle size={12}/> Selesai</span>;
      default: return null;
    }
  };

  // --- FUNGSI BARU UNTUK BADGE PRIORITAS ---
  const getPriorityBadge = (priority: string) => {
    if (priority === 'URGENT') return <span className="inline-flex items-center px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-black border border-red-100 shadow-sm tracking-wider">🚨 URGENT</span>;
    if (priority === 'LOW') return <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[9px] font-black border border-slate-200 shadow-sm tracking-wider">🟢 LOW</span>;
    return <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black border border-amber-100 shadow-sm tracking-wider">⚡ MEDIUM</span>;
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h2 className="text-xl font-black text-slate-800 tracking-wide">Manajemen Tiket</h2>
          <p className="text-slate-500 mt-1 font-medium text-xs">Pantau dan kelola semua request logistik dari satu pintu.</p>
        </motion.div>
        
        {userRole !== 'PIC_LOGISTIK' && (
          <motion.button 
            onClick={() => router.push('/tickets/create')}
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl shadow-[0_8px_20px_rgb(79,70,229,0.3)] hover:shadow-[0_12px_25px_rgb(79,70,229,0.4)] transition-all text-sm"
          >
            <Plus size={16} strokeWidth={2.5} /> Buat Tiket Baru
          </motion.button>
        )}
      </div>

      {/* Filter Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white p-2.5 rounded-[24px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col xl:flex-row gap-3 items-center justify-between"
      >
        <div className="flex bg-slate-50/80 p-1 rounded-xl w-full xl:w-auto overflow-x-auto no-scrollbar border border-slate-100/50">
          <FilterButton label="Semua" value="ALL" currentFilter={statusFilter} onSelect={setStatusFilter} />
          <FilterButton label="Request" value="OPEN" currentFilter={statusFilter} onSelect={setStatusFilter} />
          <FilterButton label="Progress" value="IN_PROGRESS" currentFilter={statusFilter} onSelect={setStatusFilter} />
          <FilterButton label="Selesai" value="DONE" currentFilter={statusFilter} onSelect={setStatusFilter} />
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto flex-wrap">
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50/50 border border-slate-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-slate-700 font-semibold appearance-none"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="P3">P3 (Pemeliharaan)</option>
              <option value="Pengadaan">Pengadaan</option>
              <option value="Pembayaran">Pembayaran</option>
            </select>
          </div>

          <div className="relative flex-1 xl:w-60 min-w-[150px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID, Cabang, PIC..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-xs text-slate-700 font-medium"
            />
          </div>
          
          <button 
            onClick={() => handleSort('timestamp')}
            className={`p-2 border rounded-xl transition-all flex items-center gap-2 text-xs font-semibold shrink-0 ${sortConfig.key === 'timestamp' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-slate-50/50 border-slate-200/50 text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm'}`}
          >
            <ArrowDownUp size={14} /> <span className="hidden sm:inline">{sortConfig.key === 'timestamp' && sortConfig.direction === 'asc' ? 'Terlama' : 'Terbaru'}</span>
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full">
        
        {/* MOBILE VIEW */}
        <div className="md:hidden flex flex-col gap-3">
          <AnimatePresence>
            {paginatedTickets.map((ticket) => (
              <motion.div 
                key={ticket.originalId}
                layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}
                onClick={() => router.push(`/tickets/${ticket.originalId}`)}
                className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm space-y-3 cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] font-black text-indigo-600">{ticket.ticketNumber}</p>
                      {/* PENAMBAHAN BADGE PRIORITAS DI MOBILE */}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">{ticket.title}</h3>
                  </div>
                  <div className="shrink-0">{getStatusBadge(ticket.status)}</div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 rounded-md text-[10px] font-bold border border-slate-100"><Tags size={10} /> {ticket.category}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 rounded-md text-[10px] font-bold border border-slate-100">  {ticket.cabang}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 rounded-md text-[10px] font-bold border border-slate-100">  {ticket.pic}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">  {ticket.date}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          {paginatedTickets.length === 0 && <div className="text-center p-6 text-slate-400 font-medium text-xs border border-dashed rounded-xl">Tidak ada tiket ditemukan</div>}
        </div>

        {/* DESKTOP VIEW */}
        <div className="hidden md:block bg-white rounded-[24px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              
              {/* HEADER TABEL SORTABLE */}
              <thead>
                <tr className="bg-slate-50/40 border-b border-slate-200/40">
                  {[
                    { label: 'ID Tiket', key: 'ticketNumber' },
                    { label: 'Prioritas', key: 'priority' }, // <-- PENAMBAHAN KOLOM HEADER
                    { label: 'Kategori', key: 'category' },
                    { label: 'Detail Masalah', key: 'title' },
                    { label: 'Cabang', key: 'cabang' },
                    { label: 'PIC', key: 'pic' },
                    { label: 'Status', key: 'status' }
                  ].map((col) => {
                    const isActive = sortConfig.key === col.key;
                    return (
                      <th 
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/60 hover:text-slate-600 transition-colors group select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          {col.label}
                          <div className="flex flex-col text-slate-300">
                            <ChevronUp size={10} className={isActive && sortConfig.direction === 'asc' ? 'text-indigo-600 font-black' : 'opacity-40 group-hover:opacity-100'} />
                            <ChevronDown size={10} className={`-mt-1 ${isActive && sortConfig.direction === 'desc' ? 'text-indigo-600 font-black' : 'opacity-40 group-hover:opacity-100'}`} />
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                <AnimatePresence>
                  {paginatedTickets.map((ticket) => (
                    <motion.tr 
                      layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}
                      onClick={() => router.push(`/tickets/${ticket.originalId}`)}
                      key={ticket.originalId} 
                      className="border-b border-slate-100/50 hover:bg-slate-50/50 hover:shadow-[0_4px_15px_rgb(0,0,0,0.02)] transition-all duration-200 cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-semibold text-indigo-600 text-xs whitespace-nowrap">{ticket.ticketNumber}</td>
                      
                      {/* PENAMBAHAN KOLOM BADGE PRIORITAS DI DESKTOP */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(ticket.priority)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-500 rounded-md text-[10px] font-semibold border border-slate-200/60 shadow-sm whitespace-nowrap"><Tags size={10} /> {ticket.category}</span>
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
            {paginatedTickets.length === 0 && <div className="text-center p-10 text-slate-400 font-medium text-sm">Tidak ada tiket ditemukan pada filter ini</div>}
          </div>

          {/* FOOTER PAGINATION */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100/60 bg-slate-50/30">
              <span className="text-[10px] md:text-xs text-slate-500 font-semibold">
                Menampilkan <span className="text-slate-800 font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, processedTickets.length)}</span> dari <span className="text-slate-800 font-bold">{processedTickets.length}</span> tiket
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                
                <div className="flex items-center justify-center min-w-[32px] h-[32px] text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg">
                  {currentPage}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}