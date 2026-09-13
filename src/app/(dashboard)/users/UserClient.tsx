"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, X, Loader2, ChevronLeft, ChevronRight, KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { ROLES, ROLE_LABELS, VALID_TEAMS, BIDANG_REQUIRED_ROLES } from '@/src/lib/roles';

const emptyFormData = { id: '', initial: '', name: '', phone: '', email: '', role: ROLES.PIC_LOGISTIK as string, team: '' };

export default function UserClient({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();

  // State CRUD User
  const [users, setUsers] = useState(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);

  // State Reset Password
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [isResetting, setIsResetting] = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Jumlah user per halaman

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (BIDANG_REQUIRED_ROLES.includes(formData.role) && !formData.team) {
      toast.error('Bidang wajib diisi untuk role ini.');
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `/api/users/${formData.id}` : `/api/users`;
      const method = isEdit ? 'PATCH' : 'POST';

      const { id, ...payloadWithoutId } = formData;
      const finalPayload: Record<string, unknown> = isEdit ? { ...formData } : payloadWithoutId;

      // VIEWER tidak butuh bidang -- jangan kirim team sama sekali (bukan string kosong),
      // supaya server tidak menganggapnya sebagai nilai bidang yang dikirim tapi tidak valid.
      if (formData.role === ROLES.VIEWER) {
        delete finalPayload.team;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      // KITA TANGKAP BALIKAN DATA DARI API
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(isEdit ? 'Data User Diperbarui!' : 'User Baru Ditambahkan!');
        setIsModalOpen(false);

        // --- OPTIMISTIC UPDATE: Langsung update tabel lokal tanpa refresh ---
        if (isEdit) {
          setUsers(users.map(u => u.id === formData.id ? data.user : u));
        } else {
          setUsers([...users, data.user]);
        }

        // Cukup suruh Next.js sync background, tanpa reload browser
        router.refresh();
      } else {
        toast.error(data.error || 'Gagal menyimpan data user.');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };
  // Handle Reset Password
  const openResetModal = (id: string, name: string) => {
    setResetForm({ newPassword: '', confirmPassword: '' });
    setShowResetPass(false);
    setShowResetConfirm(false);
    setResetTarget({ id, name });
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;

    if (resetForm.newPassword.length < 8) {
      return toast.error('Password baru minimal 8 karakter!');
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      return toast.error('Password baru dan konfirmasi tidak cocok!');
    }

    setIsResetting(true);
    try {
      const res = await fetch(`/api/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetForm.newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Password ${resetTarget.name} berhasil direset!`);
        setResetTarget(null);
        setResetForm({ newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Gagal mereset password.');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem.');
    } finally {
      setIsResetting(false);
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

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-end">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-xl font-black text-slate-800 tracking-wide">Manajemen User & Akses</h2>
          <p className="text-slate-500 mt-1 font-medium text-xs">Tambah, edit, dan cabut akses tim logistik.</p>
        </motion.div>
        <button onClick={() => { setFormData(emptyFormData); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm">
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
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bidang</th>
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
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${user.role === 'OPERATOR' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-600">{user.role === ROLES.VIEWER ? '-' : user.team}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setFormData(user); setIsModalOpen(true); }} className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={14} /></button>
                      <button onClick={() => openResetModal(user.id, user.name)} className="p-2 bg-slate-50 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset Password"><KeyRound size={14} /></button>
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
                    <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value, team: e.target.value === ROLES.VIEWER ? '' : formData.team})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400">
                      {Object.entries(ROLE_LABELS).map(([roleValue, label]) => (
                        <option key={roleValue} value={roleValue}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {formData.role !== ROLES.VIEWER && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">
                      Bidang {BIDANG_REQUIRED_ROLES.includes(formData.role) && <span className="text-red-500">*WAJIB</span>}
                    </label>
                    <select
                      required={BIDANG_REQUIRED_ROLES.includes(formData.role)}
                      value={formData.team}
                      onChange={e => setFormData({...formData, team: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400"
                    >
                      <option value="" disabled>-- Pilih Bidang --</option>
                      {VALID_TEAMS.map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                  </div>
                )}
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

      {/* Modal Reset Password */}
      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-800">
                  <KeyRound size={18} className="text-amber-600" />
                  <h3 className="font-black">Reset Password: {resetTarget.name}</h3>
                </div>
                <button onClick={() => setResetTarget(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-slate-500">Password Baru</label>
                  <div className="relative">
                    <input
                      type={showResetPass ? "text" : "password"}
                      required
                      value={resetForm.newPassword}
                      onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300 pr-10"
                      placeholder="Minimal 8 karakter"
                    />
                    <button type="button" onClick={() => setShowResetPass(!showResetPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                      {showResetPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-slate-500">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <input
                      type={showResetConfirm ? "text" : "password"}
                      required
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-300 pr-10"
                      placeholder="Ulangi password baru"
                    />
                    <button type="button" onClick={() => setShowResetConfirm(!showResetConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                      {showResetConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setResetTarget(null)} className="flex-1 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">
                    Batal
                  </button>
                  <button type="submit" disabled={isResetting} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 text-white font-bold rounded-xl shadow-md hover:bg-amber-700 transition-colors disabled:opacity-70 text-sm">
                    {isResetting ? <Loader2 size={16} className="animate-spin" /> : 'Reset'}
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