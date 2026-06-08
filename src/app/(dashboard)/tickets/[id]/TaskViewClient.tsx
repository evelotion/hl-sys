// src/app/(dashboard)/tickets/[id]/TaskViewClient.tsx
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Save, Loader2, X, Calendar, Clock, CheckCircle2, AlertCircle, UploadCloud, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression'; // <-- Tambahan untuk Poin 3

export default function TaskViewClient({ initialTicket, pics, currentUser }: { initialTicket: any, pics: any[], currentUser: any }) {
  const router = useRouter();
  
  const [ticket, setTicket] = useState<any>(initialTicket || {});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // <-- State Upload Poin 3
  
  const [comment, setComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const todayLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

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

  // LOGIC UPLOAD GAMBAR BARU (Poin 3)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      // 1. Kompres gambar dulu biar ringan
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      const uploadData = new FormData();
      uploadData.append('file', compressedFile);

      // 2. Tembak ke API lokal kita sendiri (Bebas CORS & Firewall!)
      const res = await fetch('/api/upload', { 
        method: 'POST', 
        body: uploadData 
      });
      
      const data = await res.json();
      
      if (data.success && data.url) {
        // 3. Masukkan URL gambar dari server ke state editForm
        setEditForm({ ...editForm, issueImgUrl: data.url });
        toast.success("Gambar berhasil diunggah!");
      } else {
        toast.error("Gagal mengunggah file. Ditolak server.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Terjadi kesalahan jaringan saat mengunggah file.");
    } finally {
      setIsUploading(false);
    }
  };
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setIsCommenting(true);
    
    // Simpan teks komentar ke variabel sementara biar aman
    const currentComment = comment; 
    setComment(''); // Langsung kosongkan input box (Instan Feedback)
    
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_COMMENT', message: currentComment, userId: currentUser?.id })
      });
      
      if (res.ok) {
        toast.success('Catatan berhasil dikirim!', { style: { borderRadius: '12px', background: '#333', color: '#fff' } });
        
        // --- OPTIMISTIC UPDATE: Masukkan komentar pura-pura ke UI secara instan ---
        const newLog = {
          id: Date.now().toString(), // ID sementara
          action: 'COMMENT',
          message: currentComment,
          createdAt: new Date().toISOString(),
          user: {
            name: currentUser?.name || 'Saya',
            initial: currentUser?.name?.charAt(0) || '?',
            role: currentUser?.role || 'UNKNOWN'
          }
        };
        setTicket({ ...ticket, logs: [...(ticket.logs || []), newLog] });
        
        // Sync background
        router.refresh();
      }
    } catch (error) {
      toast.error('Gagal mengirim catatan!');
      setComment(currentComment); // Kembalikan teks jika gagal
    } finally {
      setIsCommenting(false);
    }
  };

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
        toast.success('Perubahan berhasil disimpan!', { style: { borderRadius: '12px', background: '#333', color: '#fff' } });
        
        // IMPROVE POIN 1: NOTIFIKASI MS TEAMS UNTUK RE-ASSIGNMENT
        if (data.isReassigned && data.ticket.pic) {
           const newPic = data.ticket.pic;
           const isSendNotif = window.confirm(`Tiket di-reassign ke ${newPic.name}. Ingin kirim notifikasi penugasan ke MS Teams yang bersangkutan?`);
           if (isSendNotif && newPic.email) {
              const loginLink = `${window.location.origin}/login?nip=${newPic.initial}&pwd=password123`;
              
              // HILANGKAN BINTANG DI SINI UNTUK TEAMS
              const notifText = `🚨 RE-ASSIGNMENT TUGAS HL-SYS 🚨\n\nHalo ${newPic.name}, ada tugas logistik yang baru saja dialihkan/di-reassign ke kamu nih:\n\nNo. Tiket: ${ticket.ticketNumber}\nKategori: ${data.ticket.category}\nPerihal: ${data.ticket.title}\n\nSegera cek detail pekerjaan di sistem:\n${loginLink}`;
              
              const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(newPic.email)}&message=${encodeURIComponent(notifText)}`;
              window.open(teamsUrl, '_blank');
           } else if (isSendNotif && !newPic.email) {
              toast.error(`Gagal mengirim Teams. Email ${newPic.name} belum terdaftar di sistem.`);
           }
        }
        
        router.refresh();
      }
    } catch (error) {
      toast.error('Gagal menyimpan tiket!');
    } finally {
      setIsSaving(false);
    }
  };

  // IMPROVE POIN 6: HANDLE DELETE TICKET
  const handleDeleteTicket = async () => {
    if (!window.confirm("⚠️ PERINGATAN: Anda yakin ingin menghapus tiket ini secara permanen? Seluruh riwayat akan hilang dan tidak dapat dikembalikan.")) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Tiket berhasil dihapus!");
        router.push('/tickets');
        router.refresh();
      } else {
        toast.error("Gagal menghapus tiket dari database.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsSaving(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

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
            
            {/* TAMBAHAN: INFO PEMOHON / PELAPOR */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pemohon / Pelapor</p>
              
              {ticket?.requesterEmail ? (
                <a 
                  href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(ticket.requesterEmail)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col hover:opacity-80 transition-opacity"
                >
                  <p className="font-bold text-indigo-600 underline decoration-indigo-200 underline-offset-4">{ticket?.requesterName}</p>
                  <p className="text-[10px] text-indigo-400 font-medium group-hover:text-indigo-500">{ticket.requesterEmail}</p>
                </a>
              ) : (
                <p className="font-bold text-slate-800">{ticket?.requesterName || '-'}</p>
              )}
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden border border-slate-100 flex flex-col">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
                <h2 className="text-lg font-black text-slate-800">Edit Tiket {ticket?.ticketNumber}</h2>
                <button onClick={() => setIsEditOpen(false)} className="p-2 bg-slate-50 text-slate-500 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <form id="edit-form" onSubmit={handleSaveEdit} className="space-y-5">
                  <div className="space-y-1 border-b border-slate-100 pb-4">
                    <label className="text-xs font-bold text-slate-500">Tanggal Permintaan</label>
                    <input type="date" required max={todayLocal} value={editForm.requestDate} onChange={(e) => setEditForm({ ...editForm, requestDate: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300" />
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

                  {/* IMPROVE POIN 3: FITUR UBAH/TAMBAH GAMBAR DI MODAL EDIT */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">File Pendukung (Opsional)</label>
                    {!editForm.issueImgUrl ? (
                      <label className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isUploading ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}`}>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                        {isUploading ? <span className="text-sm font-bold text-indigo-600 flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> Uploading...</span> : <span className="text-sm font-semibold text-slate-500 flex items-center gap-2"><UploadCloud size={16}/> Klik untuk Upload File Baru</span>}
                      </label>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm w-full md:w-1/2 h-32 group">
                        <img src={editForm.issueImgUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <button type="button" onClick={() => setEditForm({...editForm, issueImgUrl: ''})} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg transition-colors">Hapus & Ganti</button>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                {/* IMPROVE POIN 6: TOMBOL HAPUS TIKET */}
                <button type="button" onClick={handleDeleteTicket} disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 text-red-500 font-bold hover:bg-red-100 rounded-xl transition-colors text-xs disabled:opacity-50">
                  <Trash2 size={14} /> Hapus Tiket
                </button>
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Batal</button>
                  <button form="edit-form" type="submit" disabled={isSaving || isUploading} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 text-sm">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}