"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { useRouter } from 'next/navigation'; 
import { CheckCircle2, Clock, AlertCircle, ArrowLeft, Building2, UserCircle2, Tags } from 'lucide-react';

// Sesuaikan interface agar menerima object ticket dari page.tsx
interface TaskViewClientProps {
  ticket: {
    id: string;
    displayId: string;
    category: string;
    title: string;
    description: string;
    status: string;
    branchName: string;
    picName: string;
    createdAt: string;
  }
}

export default function TaskViewClient({ ticket }: TaskViewClientProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const router = useRouter(); 

  // Definisi urutan status untuk Stepper
  const steps = [
    { id: 'OPEN', label: 'Request Masuk', icon: AlertCircle },
    { id: 'IN_PROGRESS', label: 'On Progress', icon: Clock },
    { id: 'DONE', label: 'Selesai', icon: CheckCircle2 }
  ];

  // Cari index status saat ini (0 = OPEN, 1 = IN_PROGRESS, 2 = DONE)
  const currentStepIndex = steps.findIndex(s => s.id === ticket.status);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'hl_sys_preset');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await res.json();
      
      if (data.secure_url) {
        setProofUrl(data.secure_url);
        
        try {
          // Pakai ticket.id dari props
          const resolveRes = await fetch(`/api/tickets/${ticket.id}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proofUrl: data.secure_url }),
          });

          if (resolveRes.ok) {
            router.refresh();
          }
        } catch (err) {
          console.error("Gagal hit API backend:", err);
        }
      }
    } catch (error) {
      console.error("Gagal upload bukti kerja:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header Info */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <button onClick={() => router.push('/tickets')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors w-fit font-bold text-sm">
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </button>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-extrabold text-sm rounded-lg">{ticket.displayId}</span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg flex items-center gap-1"><Tags size={14}/> {ticket.category}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800">{ticket.title}</h2>
          <p className="text-sm font-medium text-slate-500 mt-2">Dibuat pada: {ticket.createdAt}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Kiri: SLA Stepper & Upload */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="md:col-span-2 space-y-6">
          
          {/* STEPPER SLA (Glassmorphism) */}
          <div className="bg-white/70 backdrop-blur-2xl p-6 rounded-3xl border border-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Status Pengerjaan (SLA)</h3>
            <div className="relative flex justify-between items-center w-full">
              {/* Garis background stepper */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-100 rounded-full -z-10" />
              {/* Garis progress stepper */}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: currentStepIndex === 0 ? '0%' : currentStepIndex === 1 ? '50%' : '100%' }}
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-indigo-500 rounded-full -z-10 transition-all duration-700 ease-out" 
              />
              
              {steps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 shadow-sm
                      ${isActive ? 'bg-indigo-600 border-indigo-100 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                    >
                      <Icon size={20} className={isCurrent ? 'animate-pulse' : ''} />
                    </div>
                    <span className={`text-xs font-bold ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AREA UPLOAD BUKTI (Hanya muncul jika belum DONE) */}
          {ticket.status !== 'DONE' && (
            <div className="bg-white/70 backdrop-blur-2xl p-6 rounded-3xl border border-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]">
               <h3 className="text-lg font-bold text-slate-800 mb-4">Selesaikan Tugas</h3>
               <div className="relative">
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="hidden" id="upload-proof" />
                <label htmlFor="upload-proof" className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                    isUploading ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/50'
                  }`}
                >
                  {isUploading ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 text-indigo-600 font-bold">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
                      Mengunggah Bukti & Menutup Tiket...
                    </motion.div>
                  ) : (
                    <>
                      <div className="w-12 h-12 mb-3 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><CheckCircle2 size={24}/></div>
                      <span className="text-slate-600 font-bold text-sm">Klik untuk Unggah Bukti Kerja</span>
                      <span className="text-slate-400 font-medium text-xs mt-1">(Otomatis kompresi maks 1MB)</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* PREVIEW GAMBAR (Muncul setelah upload berhasil) */}
          <AnimatePresence>
            {proofUrl && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl overflow-hidden shadow-lg border border-white/30 relative">
                <img src={proofUrl} alt="Bukti Kerja" className="w-full h-auto object-cover max-h-96" />
                <div className="absolute bottom-0 w-full p-4 bg-green-500/90 backdrop-blur-md text-white text-center text-sm font-bold flex justify-center items-center gap-2">
                  <CheckCircle2 size={18}/> Tiket Berhasil Ditutup (Resolved)
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Kolom Kanan: Detail Informasi */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="bg-white/70 backdrop-blur-2xl p-6 rounded-3xl border border-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unit / Cabang</p>
              <div className="flex items-center gap-2 text-slate-800 font-semibold"><Building2 size={18} className="text-indigo-500"/> {ticket.branchName}</div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">PIC Logistik</p>
              <div className="flex items-center gap-2 text-slate-800 font-semibold"><UserCircle2 size={18} className="text-indigo-500"/> {ticket.picName}</div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deskripsi Detail</p>
              <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {ticket.description}
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}