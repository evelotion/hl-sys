// src/app/(dashboard)/tickets/[id]/TaskViewClient.tsx
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Save, Loader2, X, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TaskViewClient({ initialTicket, pics, currentUser }: { initialTicket: any, pics: any[], currentUser: any }) {
  const router = useRouter();
  
  // State Utama dengan type casting 'as any' biar terhindar dari type inference parsial
  const [ticket, setTicket] = useState<any>(initialTicket || {});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // State untuk chat/komentar log
  const [comment, setComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  // Helper untuk mendapatkan tanggal lokal hari ini (menghindari bug UTC)
  const todayLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  // State untuk form edit pakai Optional Chaining (?.) biar anti-crash
  const [editForm, setEditForm] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    category: ticket?.category || '',
    branchName: ticket?.branchName || '',
    picId: ticket?.picId || '',
    requestDate: ticket?.requestDate ? new Date(ticket.requestDate).toISOString().split('T')[0] : '',
    mediaRequest: ticket?.mediaRequest || 'Telepon',
    issueImgUrl: ticket?.issueImgUrl || ''
  });

  const p3Initials = ['FER', 'MAU', 'ASM', 'MLK', 'NOV', 'IND', 'SML', 'IBL'];
  const pembayaranInitials = ['RIN', 'ETK', 'RKS', 'RLY'];
  const pengadaanInitials = ['GES', 'RAP', 'YNS', 'AND', 'IDH', 'RML', 'HEN', 'MWS'];

  const filteredPics = pics?.filter(pic => {
    if (editForm.category === 'P3') return p3Initials.includes(pic.initial);
    if (editForm.category === 'Pembayaran') return pembayaranInitials.includes(pic.initial);
    if (editForm.category === 'Pengadaan') return pengadaanInitials.includes(pic.initial);
    return false;
  }) || [];

  // Fungsi nambah komentar (Activity Log)
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setIsCommenting(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_COMMENT', message: comment, userId: currentUser?.id })
      });
      if (res.ok) {
        setComment('');
        toast.success('Catatan berhasil dikirim!', { style: { borderRadius: '12px', background: '#333', color: '#fff' } });
        router.refresh();
      }
    } catch (error) {
      toast.error('Gagal mengirim catatan!');
    } finally {
      setIsCommenting(false);
    }
  };

  // Fungsi simpan Edit (PATCH)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, userId: currentUser?.id })
      });
      const data = await res.json();
      if (data.success) {
        setTicket({ ...ticket, ...data.ticket });
        setIsEditOpen(false);
        toast.success('Perubahan tiket berhasil disimpan!', { style: { borderRadius: '12px', background: '#333', color: '#fff' } });
        router.refresh();
      }
    } catch (error) {
      toast.error('Gagal menyimpan tiket!');
    } finally {
      setIsSaving(false);
    }
  };

  // Fungsi update status (Untuk PIC logistik lapor selesai)
  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_STATUS', status: newStatus, userId: currentUser?.id })
      });
      const data = await res.json();
      if (data.success) {
        setTicket({ ...ticket, status: newStatus, resolvedAt: data.ticket.resolvedAt });
        toast.success(`Status diubah menjadi ${newStatus.replace('_', ' ')}!`, { icon: '🔥', style: { borderRadius: '12px', background: '#333', color: '#fff' } });
        router.refresh();
      }
    } catch (error) {
      toast.error('Gagal mengubah status!');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Format Tanggal
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Cek apakah SLA sudah lewat
  const isOverdue = ticket?.slaDeadline && new Date() > new Date(ticket.slaDeadline) && ticket?.status !== 'DONE';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/tickets')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold text-sm transition-colors">
          <ArrowLeft size={16} /> Kembali ke Daftar
        </button>
        
        {currentUser?.role === 'OPERATOR' && (
          <button onClick={() => setIsEditOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 hover:text-indigo-600 transition-all text-sm">
            <Edit size={16} /> Edit Tiket
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[24px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">{ticket?.ticketNumber}</span>
              <span className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">{ticket?.category}</span>
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                ticket?.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                ticket?.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-red-50 text-red-600 border-red-100'
              }`}>
                {ticket?.status?.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-800 mb-2">{ticket?.title}</h1>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{ticket?.description}</p>
          </div>

          <div className="bg-white p-8 rounded-[24px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">Jejak Aktivitas & Catatan</h3>
            
            <div className="space-y-5 mb-6">
              {ticket?.logs?.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">Belum ada catatan aktivitas.</p>
              ) : (
                ticket?.logs?.map((log: any) => (
                  <div key={log.id} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 border border-slate-200">
                      {log.user?.initial || '?'}
                    </div>
                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-700">{log.user?.name} <span className="font-medium text-slate-400">({log.user?.role === 'OPERATOR' ? 'ADM' : 'PIC'})</span></span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className={`text-sm ${log.action === 'SYSTEM' ? 'text-indigo-600 font-medium italic' : 'text-slate-600'}`}>
                        {log.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-3">
              <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ketik catatan / update progress di sini..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-300" />
              <button type="submit" disabled={isCommenting || !comment.trim()} className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm">
                {isCommenting ? 'Kirim...' : 'Kirim'}
              </button>
            </form>
          </div>

          {ticket?.issueImgUrl && (
  <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 size={16}/> File Pendukung (Bukti)</h3>
    <a href={ticket.issueImgUrl} target="_blank" rel="noopener noreferrer" className="block w-full md:w-1/2 rounded-xl border border-slate-200 overflow-hidden hover:opacity-80 transition-opacity cursor-pointer">
      <img src={ticket.issueImgUrl} alt="Bukti" className="w-full h-auto" />
    </a>
    <p className="text-[10px] text-slate-400 mt-2 font-medium italic">*Klik gambar untuk melihat dokumen penuh.</p>
  </div>
)}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PIC Ditugaskan</p>
              <p className="font-bold text-slate-800">{ticket?.pic?.name || 'Belum di-assign'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cabang / Unit</p>
              <p className="font-bold text-slate-800">{ticket?.branchName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Media Laporan</p>
              <p className="font-bold text-slate-800">{ticket?.mediaRequest || '-'}</p>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Timeline & SLA</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-slate-400" />
                  <span className="text-slate-600 font-medium">Tgl Request: <b className="text-slate-800">{formatDate(ticket?.requestDate)}</b></span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={16} className={isOverdue ? 'text-red-500' : 'text-amber-500'} />
                  <span className="text-slate-600 font-medium">SLA Deadline: <b className={isOverdue ? 'text-red-600' : 'text-slate-800'}>{formatDate(ticket?.slaDeadline)}</b></span>
                </div>
                {isOverdue && (
                  <div className="bg-red-50 text-red-600 p-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-red-100">
                    <AlertCircle size={14}/> Melewati Target SLA!
                  </div>
                )}
              </div>
            </div>
          </div>

         {ticket?.status !== 'DONE' && (currentUser?.id === ticket?.picId || currentUser?.role === 'OPERATOR') && (
            <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-200/60 shadow-inner flex flex-col gap-3">
              {ticket?.status === 'OPEN' && (
                <button onClick={() => handleUpdateStatus('IN_PROGRESS')} disabled={isUpdatingStatus} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-colors text-sm">
                  {isUpdatingStatus ? 'Memproses...' : 'Mulai Kerjakan (In Progress)'}
                </button>
              )}
              {ticket?.status === 'IN_PROGRESS' && (
                <button onClick={() => handleUpdateStatus('DONE')} disabled={isUpdatingStatus} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-colors text-sm">
                  {isUpdatingStatus ? 'Memproses...' : 'Tandai Selesai (Done)'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden border border-slate-100">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
                <h2 className="text-lg font-black text-slate-800">Edit Tiket {ticket?.ticketNumber}</h2>
                <button onClick={() => setIsEditOpen(false)} className="p-2 bg-slate-50 text-slate-500 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
                <div className="space-y-1 border-b border-slate-100 pb-4">
                  <label className="text-xs font-bold text-slate-500">Tanggal Permintaan (Request Date)</label>
                  <input 
                    type="date" 
                    required 
                    max={todayLocal} // <--- Tambahan limit max disini
                    value={editForm.requestDate} 
                    onChange={(e) => setEditForm({ ...editForm, requestDate: e.target.value })} 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Kategori</label>
                    <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value, picId: '' })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300">
                      <option value="P3">P3 (Pemeliharaan & Aset)</option>
                      <option value="Pengadaan">Pengadaan (Pembelian)</option>
                      <option value="Pembayaran">Pembayaran</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Ubah PIC</label>
                    <select value={editForm.picId} onChange={(e) => setEditForm({ ...editForm, picId: e.target.value })} className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-sm font-bold outline-none focus:border-indigo-300">
                      <option value="" disabled>-- Pilih PIC Baru --</option>
                      {filteredPics.map((pic: any) => (
                        <option key={pic.id} value={pic.id}>{pic.name} ({pic.initial})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Perihal (Judul)</label>
                  <input type="text" required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Deskripsi Masalah</label>
                  <textarea required rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300 resize-none"></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Batal</button>
                  <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 text-sm">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}