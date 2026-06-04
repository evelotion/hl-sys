// hl-sys/src/app/(dashboard)/tickets/create/CreateTicketClient.tsx
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, UploadCloud, CheckCircle2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

// Tambahin typing phone opsional biar TypeScript nggak marah
interface PIC {
  id: string;
  name: string;
  initial: string;
  phone?: string | null; 
}

export default function CreateTicketClient({ pics }: { pics: PIC[] }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Bikin helper buat dapetin tanggal YYYY-MM-DD lokal hari ini
  const todayLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    requestDate: todayLocal, // <-- Set default langsung hari ini
    mediaRequest: 'Lisan / Verbal',
    branchName: '',
    requesterName: '', // Pastikan ini tetap ada
    category: '',
    picId: '',
    title: '', 
    description: '',
    issueImgUrl: ''
  });

  const p3Initials = ['FER', 'MAU', 'ASM', 'MLK', 'NOV', 'IND', 'SML', 'IBL'];
  const pembayaranInitials = ['RIN', 'ETK', 'RKS', 'RLY'];
  const pengadaanInitials = ['GES', 'RAP', 'YNS', 'AND', 'IDH', 'RML', 'HEN', 'MWS']; 

  const filteredPics = pics.filter(pic => {
    if (formData.category === 'P3') return p3Initials.includes(pic.initial);
    if (formData.category === 'Pembayaran') return pembayaranInitials.includes(pic.initial);
    if (formData.category === 'Pengadaan') return pengadaanInitials.includes(pic.initial);
    return false;
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const uploadData = new FormData();
      uploadData.append('file', compressedFile);
      uploadData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'hl_sys_preset');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: uploadData }
      );
      const data = await res.json();
      if (data.secure_url) setFormData({ ...formData, issueImgUrl: data.secure_url });
    } catch (error) {
      console.error("Gagal upload media:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi Anti-Spasi (Trim)
    const titleReal = formData.title.trim();
    const descReal = formData.description.trim();

    if (titleReal.length < 5) {
      alert("⚠️ Perihal harus diisi minimal 5 karakter huruf/angka!");
      return;
    }
    if (descReal.length < 10) {
      alert("⚠️ Deskripsi harus diisi minimal 10 karakter huruf/angka!");
      return;
    }
    if (formData.mediaRequest !== 'Lisan / Verbal' && !formData.issueImgUrl) {
      alert("⚠️ File pendukung WAJIB di-upload jika media request bukan Lisan / Verbal!");
      return;
    }
    if (!formData.category || !formData.picId) {
      alert("Pilih Kategori dan PIC terlebih dahulu!");
      return;
    }

    setIsLoading(true);

    try {
      const finalPayload = { ...formData, title: titleReal, description: descReal };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      const data = await res.json();

      if (res.ok) {
        // --- LOGIKA WHATSAPP REDIRECT ---
        const selectedPic = pics.find(p => p.id === formData.picId);
        
        if (selectedPic && selectedPic.phone) {
          // Format nomor: Ubah awalan '0' atau '+62' jadi murni '62'
          let waNumber = selectedPic.phone.replace(/[^0-9]/g, '');
          if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1);

          const ticketNum = data.ticket?.ticketNumber || 'Terbaru';
          
          // --- PENAMBAHAN GENERATE LINK AUTO LOGIN (LANGKAH 2) ---
          const baseUrl = window.location.origin; 
          const defaultPassword = 'password123'; // <-- Ubah ke password default asli kalau beda
          const loginLink = `${baseUrl}/login?nip=${selectedPic.initial}&pwd=${defaultPassword}`;
          
          // Template Pesan WA (Gunakan \n untuk baris baru)
          const waText = `*🚨 TUGAS BARU HL-SYS 🚨*\n\nHalo ${selectedPic.name}, ada request logistik baru yang masuk dan di-assign ke kamu nih:\n\n*No. Tiket:* ${ticketNum}\n*Kategori:* ${formData.category}\n*Cabang/Unit:* ${formData.branchName}\n*Pemohon:* ${formData.requesterName}\n*Perihal:* ${titleReal}\n\nSegera cek detail pekerjaan dan klik mulai proses (In Progress) melalui link login otomatis berikut:\n${loginLink}\n\nSemangat! 💪`;
          // -------------------------------------------------------

          const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;
          
          // Buka WA di tab baru
          window.open(waUrl, '_blank');
        } else {
          // Kalau nomor PIC kosong di database, kasih alert
          alert("Info: Nomor HP PIC tidak terdaftar di sistem. Notifikasi WhatsApp dilewati.");
        }
        // -------------------------------

        // Balik ke halaman daftar tiket
        router.push('/tickets');
        router.refresh();
      } else {
        alert("Gagal menyimpan tiket: " + data.error);
        setIsLoading(false);
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors font-bold text-sm mb-4">
          <ArrowLeft size={16} /> Kembali
        </button>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Buat Tiket Baru</h2>
        <p className="text-slate-500 mt-1 font-medium text-xs">Pusat penugasan internal Departemen Logistik.</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="bg-white p-6 md:p-8 rounded-[24px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tanggal Permintaan</label>
            <input 
              required 
              type="date" 
              max={todayLocal} // <-- Tambahan batas max di sini
              value={formData.requestDate} 
              onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Landasan Permintaan (Media)</label>
            <select value={formData.mediaRequest} onChange={(e) => setFormData({ ...formData, mediaRequest: e.target.value, issueImgUrl: e.target.value === 'Lisan / Verbal' ? '' : formData.issueImgUrl })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
            >
              <option value="Lisan / Verbal">Lisan / Verbal</option>
              <option value="Email">Email</option>
              <option value="Memo / Form Fisik">Memo / Form Fisik</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Cabang / Unit Pemohon</label>
            <input required type="text" placeholder="Contoh: KCP Depok" value={formData.branchName} onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nama Pemohon</label>
            <input required type="text" placeholder="Contoh: Budi Santoso" value={formData.requesterName} onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Kategori Tugas</label>
            <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value, picId: '' })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
            >
              <option value="" disabled>-- Pilih Kategori --</option>
              <option value="P3">P3 (Pemeliharaan & Aset)</option>
              <option value="Pengadaan">Pengadaan (Pembelian)</option>
              <option value="Pembayaran">Pembayaran</option>
            </select>
          </div>
        </div>

        <AnimatePresence>
          {formData.category && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Assign ke PIC Logistik</label>
              <select required value={formData.picId} onChange={(e) => setFormData({ ...formData, picId: e.target.value })}
                className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-bold text-indigo-700 shadow-sm"
              >
                <option value="" disabled>-- Tentukan PIC Pekerjaan --</option>
                {filteredPics.map(pic => (
                  <option key={pic.id} value={pic.id}>{pic.name} ({pic.initial})</option>
                ))}
              </select>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2 border-t border-slate-100 pt-6">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Perihal</label>
          <input required minLength={5} type="text" placeholder="Contoh: Permintaan Cetak Form Mutasi (Min 5 Karakter)" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Deskripsi Lengkap</label>
          <textarea required minLength={10} rows={4} placeholder="Jelaskan detail request/permasalahan secara rinci... (Min 10 Karakter)" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700 resize-none"
          ></textarea>
        </div>

        <div className={`space-y-2 transition-opacity duration-300 ${formData.mediaRequest === 'Lisan / Verbal' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex justify-between">
            <span>Upload File Pendukung {formData.mediaRequest !== 'Lisan / Verbal' && <span className="text-red-500">*WAJIB</span>}</span>
            {formData.mediaRequest === 'Lisan / Verbal' && <span className="text-red-500">Dinonaktifkan untuk Lisan/Verbal</span>}
          </label>
          
          {!formData.issueImgUrl ? (
            <div className="relative">
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading || formData.mediaRequest === 'Lisan / Verbal'} className="hidden" id="upload-issue" />
              <label htmlFor="upload-issue" className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                  isUploading ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                {isUploading ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-indigo-600 font-bold text-sm">
                    <Loader2 size={18} className="animate-spin" /> Mengunggah File...
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-3 text-slate-500 font-semibold text-sm">
                    <UploadCloud size={20} /> Klik untuk Unggah Bukti (Memo/Email)
                  </div>
                )}
              </label>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm group w-full md:w-1/2">
               <img src={formData.issueImgUrl} alt="File Issue" className="w-full h-auto object-cover max-h-48" />
               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                 <button type="button" onClick={() => setFormData({ ...formData, issueImgUrl: '' })} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow-lg transition-colors">Hapus Gambar</button>
               </div>
               <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-md flex items-center gap-1.5 shadow-sm"><CheckCircle2 size={12}/> File Terlampir</div>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-100">
          <motion.button whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.98 }} disabled={isLoading} type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold rounded-xl shadow-[0_8px_20px_rgb(79,70,229,0.25)] hover:shadow-[0_12px_25px_rgb(79,70,229,0.35)] transition-all duration-300 disabled:opacity-70 text-sm"
          >
            {isLoading ? <><Loader2 size={18} className="animate-spin" /> Menyimpan Tiket & Mengirim Notif...</> : <><Save size={18} /> Simpan & Beri Notif WA ke PIC</>}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}