"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function CreateTicketClient({ pics }: { pics: { id: string, name: string }[] }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Umum',
    branchName: '',
    picId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/tickets');
        router.refresh();
      } else {
        console.error('Gagal bikin tiket');
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-sm mb-4"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Buat Tiket Baru</h2>
        <p className="text-slate-500 mt-1 font-medium">Input keluhan dari cabang dan delegasikan ke PIC Logistik.</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="bg-white/70 backdrop-blur-2xl p-6 md:p-8 rounded-3xl border border-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Nama Cabang / Unit</label>
            <input
              required
              type="text"
              placeholder="Contoh: Cabang Sudirman"
              value={formData.branchName}
              onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
              className="w-full px-4 py-3 bg-white/50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Kategori</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-white/50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
            >
              <option value="Umum">Umum</option>
              <option value="Perbaikan Fasilitas">Perbaikan Fasilitas</option>
              <option value="Permintaan ATK">Permintaan ATK</option>
              <option value="IT & Jaringan">IT & Jaringan</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Judul Masalah</label>
          <input
            required
            type="text"
            placeholder="Contoh: AC Mati di Ruang Rapat"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-white/50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Deskripsi Lengkap</label>
          <textarea
            required
            rows={4}
            placeholder="Ceritakan detail masalahnya..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-white/50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium resize-none"
          ></textarea>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Assign ke PIC Logistik (Opsional)</label>
          <select
            value={formData.picId}
            onChange={(e) => setFormData({ ...formData, picId: e.target.value })}
            className="w-full px-4 py-3 bg-white/50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
          >
            <option value="">-- Pilih PIC --</option>
            {pics.map(pic => (
              <option key={pic.id} value={pic.id}>{pic.name}</option>
            ))}
          </select>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] transition-all disabled:opacity-70"
          >
            {isLoading ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Tiket</>}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}