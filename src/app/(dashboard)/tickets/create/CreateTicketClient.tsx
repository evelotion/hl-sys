// hl-sys/src/app/(dashboard)/tickets/create/CreateTicketClient.tsx
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, UploadCloud, CheckCircle2, Check } from 'lucide-react'; 
import imageCompression from 'browser-image-compression';

interface PIC {
  id: string;
  name: string;
  initial: string;
  phone?: string | null;
  email?: string | null;
}

export default function CreateTicketClient({ pics }: { pics: PIC[] }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const todayLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    requestDate: todayLocal,
    mediaRequest: 'Lisan / Verbal',
    branchName: '',
    requesterName: '',
    requesterEmail: '', 
    priority: 'MEDIUM', // <--- STATE BARU: Default MEDIUM
    category: '',
    picId: '',
    title: '',
    description: '',
    issueImgUrl: '',
    notificationMethods: ['teams', 'email'] 
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

  const toggleNotification = (method: string) => {
    setFormData(prev => ({
      ...prev,
      notificationMethods: prev.notificationMethods.includes(method)
        ? prev.notificationMethods.filter(m => m !== method) 
        : [...prev.notificationMethods, method] 
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      const uploadData = new FormData();
      uploadData.append('file', compressedFile);

      const res = await fetch('/api/upload', { 
        method: 'POST', 
        body: uploadData 
      });
      
      const data = await res.json();
      
      if (data.success && data.url) {
        setFormData({ ...formData, issueImgUrl: data.url });
      } else {
        alert("Gagal mengunggah file. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Gagal upload media:", error);
      alert("Terjadi kesalahan jaringan saat mengunggah file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    if (formData.mediaRequest !== 'Lisan / Verbal' && formData.mediaRequest !== 'Teams Form' && !formData.issueImgUrl) {
      alert("⚠️ File pendukung WAJIB di-upload jika media request bukan Lisan / Verbal atau Teams Form!");
      return;
    }
    if (!formData.category || !formData.picId) {
      alert("Pilih Kategori dan PIC terlebih dahulu!");
      return;
    }

    setIsLoading(true);

    try {
      const finalPayload = {
        ...formData,
        title: titleReal,
        description: descReal
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      const data = await res.json();

      if (res.ok) {
        const selectedPic = pics.find(p => p.id === formData.picId);

        if (selectedPic) {
          const ticketNum = data.ticket?.ticketNumber || 'Terbaru';
          const baseUrl = window.location.origin;
          const loginLink = `${baseUrl}/login?nip=${selectedPic.initial}&pwd=password123`;

          // UPDATE: TAMBAHAN INFO PRIORITAS DI NOTIFIKASI
          const waText = `*🚨 TUGAS BARU HL-SYS 🚨*\n\nHalo ${selectedPic.name}, ada request logistik baru yang masuk dan di-assign ke kamu nih:\n\n*No. Tiket:* ${ticketNum}\n*Prioritas SLA:* ${formData.priority}\n*Kategori:* ${formData.category}\n*Cabang/Unit:* ${formData.branchName}\n*Pemohon:* ${formData.requesterName}\n*Perihal:* ${titleReal}\n\nSegera cek detail pekerjaan dan klik mulai proses melalui link berikut:\n${loginLink}\n\nSemangat! 💪`;

          const teamsText = `🚨 TUGAS BARU HL-SYS 🚨\n\nHalo ${selectedPic.name}, ada request logistik baru yang masuk dan di-assign ke kamu nih:\n\nNo. Tiket: ${ticketNum}\nPrioritas SLA: ${formData.priority}\nKategori: ${formData.category}\nCabang/Unit: ${formData.branchName}\nPemohon: ${formData.requesterName}\nPerihal: ${titleReal}\n\nSegera cek detail pekerjaan dan klik mulai proses melalui link berikut:\n${loginLink}\n\nSemangat! 💪`;

          const emailSubject = `[${formData.priority}] Konfirmasi Tiket Layanan Logistik: ${ticketNum} - ${titleReal}`;
          const emailBody = `Yth. Bapak/Ibu ${formData.requesterName},\n\nTerima kasih telah menghubungi Layanan Hotline Logistik BCA Syariah.\n\nBerikut adalah ringkasan tiket Anda yang telah kami terima dan masuk ke dalam antrean pengerjaan tim kami:\n\n- No. Tiket: ${ticketNum}\n- Prioritas: ${formData.priority}\n- Kategori: ${formData.category}\n- Cabang/Unit: ${formData.branchName}\n- Perihal: ${titleReal}\n- Deskripsi: ${descReal}\n- PIC Bertugas: ${selectedPic.name}\n\nKami akan segera menindaklanjuti permintaan ini sesuai dengan Standard Service Level Agreement (SLA) yang berlaku. Apabila ada informasi tambahan, PIC kami akan menghubungi Anda kembali.\n\nSalam,\nDepartemen Logistik BCA Syariah`;
          const methods = formData.notificationMethods;
          if (methods.includes('whatsapp')) {
            if (selectedPic.phone) {
              let waNumber = selectedPic.phone.replace(/[^0-9]/g, '');
              if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1);
              window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`, '_blank');
            } else {
              alert("Info: Nomor HP PIC tidak terdaftar. Notif WA dilewati.");
            }
          }

          if (methods.includes('teams')) {
            if (selectedPic.email) {
              window.open(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(selectedPic.email)}&message=${encodeURIComponent(teamsText)}`, '_blank');
            } else {
              alert("Info: Email PIC tidak terdaftar. Notif MS Teams dilewati.");
            }
          }

          if (methods.includes('email') && formData.requesterEmail) {
            window.open(`mailto:${formData.requesterEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, '_self');
          }
        }

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
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">BUAT TIKET BARU</h2>
        <p className="text-slate-500 mt-1 font-medium text-xs">Pusat Penugasan Internal Departemen Logistik.</p>
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
              required type="date" max={todayLocal}
              value={formData.requestDate}
              onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Landasan Permintaan (Media)</label>
            <select value={formData.mediaRequest} onChange={(e) => setFormData({ ...formData, mediaRequest: e.target.value, issueImgUrl: (e.target.value === 'Lisan / Verbal' || e.target.value === 'Teams Form') ? '' : formData.issueImgUrl })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
            >
              <option value="Lisan / Verbal">Lisan / Verbal</option>
              <option value="Email">Email</option>
              <option value="Memo / Form Fisik">Memo / Form Fisik</option>
              <option value="Teams Form">Teams Form</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Cabang / Unit Pemohon</label>
            <input
              required type="text" placeholder="Contoh: KCP DEPOK"
              value={formData.branchName}
              onChange={(e) => setFormData({ ...formData, branchName: e.target.value.toUpperCase() })} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700 uppercase"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nama Pemohon</label>
            <input required type="text" placeholder="Contoh: Budi Santoso" value={formData.requesterName} onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex justify-between">
              <span>Email Pemohon</span>
              <span className="text-slate-400 font-normal lowercase">(Untuk notif tiket)</span>
            </label>
            <input required type="email" placeholder="Contoh: budi_santoso@bcasyariah.co.id" value={formData.requesterEmail} onChange={(e) => setFormData({ ...formData, requesterEmail: e.target.value })}
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

          {/* INPUT BARU: TINGKAT PRIORITAS SLA */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tingkat Prioritas (SLA)</label>
            <select required value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-sm font-semibold text-slate-700"
            >
              <option value="URGENT">URGENT (1 Hari Kerja)</option>
              <option value="MEDIUM">MEDIUM (3 Hari Kerja)</option>
              <option value="LOW">LOW (7 Hari Kerja)</option>
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

        <div className={`space-y-2 transition-opacity duration-300 ${(formData.mediaRequest === 'Lisan / Verbal' || formData.mediaRequest === 'Teams Form') ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 flex justify-between">
            <span>Upload File Pendukung {(formData.mediaRequest !== 'Lisan / Verbal' && formData.mediaRequest !== 'Teams Form') && <span className="text-red-500">*WAJIB</span>}</span>
            {(formData.mediaRequest === 'Lisan / Verbal' || formData.mediaRequest === 'Teams Form') && <span className="text-red-500">Dinonaktifkan untuk {formData.mediaRequest}</span>}
          </label>
          
          {!formData.issueImgUrl ? (
            <div className="relative">
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading || formData.mediaRequest === 'Lisan / Verbal' || formData.mediaRequest === 'Teams Form'} className="hidden" id="upload-issue" />
              <label htmlFor="upload-issue" className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${isUploading ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
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
              <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-md flex items-center gap-1.5 shadow-sm"><CheckCircle2 size={12} /> File Terlampir</div>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-100">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Kirim Notifikasi Tugas Via (Bisa Pilih &gt; 1)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div onClick={() => toggleNotification('teams')} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${formData.notificationMethods.includes('teams') ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 bg-slate-50'}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${formData.notificationMethods.includes('teams') ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 bg-white'}`}>
                {formData.notificationMethods.includes('teams') && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${formData.notificationMethods.includes('teams') ? 'text-indigo-700' : 'text-slate-600'}`}>MS Teams</span>
                <span className="text-[10px] font-medium text-slate-400">Ke PIC Bertugas</span>
              </div>
            </div>

            <div onClick={() => toggleNotification('whatsapp')} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${formData.notificationMethods.includes('whatsapp') ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300 bg-slate-50'}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${formData.notificationMethods.includes('whatsapp') ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'}`}>
                {formData.notificationMethods.includes('whatsapp') && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${formData.notificationMethods.includes('whatsapp') ? 'text-emerald-700' : 'text-slate-600'}`}>WhatsApp</span>
                <span className="text-[10px] font-medium text-slate-400">Ke PIC Bertugas</span>
              </div>
            </div>

            <div onClick={() => toggleNotification('email')} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${formData.notificationMethods.includes('email') ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 bg-slate-50'}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${formData.notificationMethods.includes('email') ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'}`}>
                {formData.notificationMethods.includes('email') && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${formData.notificationMethods.includes('email') ? 'text-blue-700' : 'text-slate-600'}`}>Email Outlook</span>
                <span className="text-[10px] font-medium text-slate-400">Ke Cabang / Pemohon</span>
              </div>
            </div>

          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <motion.button whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.98 }} disabled={isLoading} type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold rounded-xl shadow-[0_8px_20px_rgb(79,70,229,0.25)] hover:shadow-[0_12px_25px_rgb(79,70,229,0.35)] transition-all duration-300 disabled:opacity-70 text-sm"
          >
            {isLoading ? <><Loader2 size={18} className="animate-spin" /> Menyimpan & Mengirim Notif...</> : <><Save size={18} /> Simpan Tiket & Beri Notifikasi</>}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}