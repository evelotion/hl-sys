"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, KeyRound, Plus, Edit, Trash2, X, Loader2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function UserClient({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();
  
  // State Developer Lock
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  
  // State CRUD User
  const [users, setUsers] = useState(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ id: '', initial: '', name: '', phone: '', email: '', role: 'PIC_LOGISTIK' });

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Jumlah user per halaman

  // Handle Unlock
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Bukatutup12@') {
      setIsUnlocked(true);
      toast.success('Akses Developer Dibuka!');
    } else {
      toast.error('Password Salah!');
      setPassword('');
    }
  };

  // Handle Submit Form (Create / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `/api/users/${formData.id}` : `/api/users`;
      const method = isEdit ? 'PATCH' : 'POST';
      
      // Pisahkan 'id' dari properti lainnya secara aman
      const { id, ...payloadWithoutId } = formData;
      const finalPayload = isEdit ? formData : payloadWithoutId;

      const res = await fetch(url, {
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(finalPayload)
      });
      
      if (res.ok) {
        toast.success(isEdit ? 'Data User Diperbarui!' : 'User Baru Ditambahkan!');
        setIsModalOpen(false);
        router.refresh();
        setTimeout(() => window.location.reload(), 1000); 
      } else {
        toast.error('Inisial mungkin sudah dipakai atau terjadi kesalahan.');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus user ${name}?`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('User berhasil dihapus!');
        setUsers(users.filter(u => u.id !== id));
      }
    } catch (error) {
      toast.error('Gagal menghapus user!');
    }
  };

  // --- LOGIKA PEMOTONGAN DATA (PAGINATION) ---
  const totalPages = Math.ceil(users.length / itemsPerPage);
  
  // Efek ini untuk mencegah error halaman kosong (misal lagi di page 3, tapi usernya dihapus semua)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [users.length, totalPages, currentPage]);

  const paginatedUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // TAMPILAN LOCK SCREEN
  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/80 backdrop-blur-2xl p-8 rounded-[24px] border border-slate-200/60 shadow-[0_10px_40px_rgb(0,0,0,0.05)] w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <ShieldAlert size={28} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-1">Developer Area</h2>
          <p className="text-xs text-slate-500 font-medium mb-6">Masukkan Security Key untuk mengelola data user.</p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 text-sm font-bold text-center tracking-[0.2em]" />
            </div>
            <button type="submit" className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
              Buka Akses <ArrowRight size={16} />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // TAMPILAN MANAJEMEN USER (JIKA UNLOCKED)
  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-end">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-xl font-black text-slate-800 tracking-wide">Manajemen User & Akses</h2>
          <p className="text-slate-500 mt-1 font-medium text-xs">Tambah, edit, dan cabut akses tim logistik.</p>
        </motion.div>
        <button onClick={() => { setFormData({ id: '', initial: '', name: '', phone: '', email: '', role: 'PIC_LOGISTIK' }); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm">
          <Plus size={16} /> Tambah User
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inisial</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Lengkap</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kontak & Email</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role Sistem</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Ganti looping dari users.map menjadi paginatedUsers.map */}
              {paginatedUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-indigo-600">{user.initial}</td>
                  <td className="px-6 py-4 font-bold text-slate-700 text-sm">{user.name}</td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-600">{user.phone || '-'}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{user.email || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${user.role === 'OPERATOR' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{user.role}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setFormData(user); setIsModalOpen(true); }} className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(user.id, user.name)} className="p-2 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {paginatedUsers.length === 0 && (
            <div className="text-center p-10 text-slate-400 font-medium text-sm">Tidak ada data user.</div>
          )}
        </div>

        {/* --- FOOTER PAGINATION --- */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100/60 bg-slate-50/30">
            <span className="text-[10px] md:text-xs text-slate-500 font-semibold">
              Menampilkan <span className="text-slate-800 font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, users.length)}</span> dari <span className="text-slate-800 font-bold">{users.length}</span> user
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

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-black text-slate-800">{formData.id ? 'Edit Data User' : 'Tambah User Baru'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Inisial (Unik 3 Huruf)</label>
                    <input type="text" required maxLength={3} value={formData.initial} onChange={e => setFormData({...formData, initial: e.target.value.toUpperCase()})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase outline-none focus:border-indigo-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Role Sistem</label>
                    <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400">
                      <option value="PIC_LOGISTIK">PIC_LOGISTIK</option>
                      <option value="OPERATOR">OPERATOR (ADMIN)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Nama Lengkap</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Nomor WhatsApp (Cth: 628...)</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Email MS Teams (UPN)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-400" />
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Batal</button>
                  <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 text-sm">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Simpan Data'}
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