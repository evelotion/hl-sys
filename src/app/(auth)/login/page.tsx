"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react'; // <-- Icon Mail gue ganti jadi User biar pas dengan Inisial
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  
  // State input: nip diubah jadi initial
  const [initial, setInitial] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorText('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Kirim initial ke backend, bukan nip
        body: JSON.stringify({ initial, password }) 
      });
      
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorText(data.error || 'Gagal login');
        setIsLoading(false);
      }
    } catch (err) {
      setErrorText('Terjadi kesalahan jaringan.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB] relative overflow-hidden selection:bg-blue-200 selection:text-blue-900">
      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-300/40 rounded-full blur-[100px] pointer-events-none" />
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, delay: 1 }} className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-300/30 rounded-full blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[340px] relative z-10">
        <div className="bg-white/40 backdrop-blur-3xl backdrop-saturate-150 rounded-[24px] p-8 border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative">
          
          <div className="text-center mb-8">
            <motion.div whileHover={{ rotate: 10, scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }} className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-100 mb-5">
              <Lock className="text-blue-600" size={20} strokeWidth={2.5} />
            </motion.div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">HL-SYS</h1>
            <p className="text-slate-400 font-semibold mt-1 text-[11px] uppercase tracking-[0.2em]">Logistik & Asset</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <AnimatePresence>
              {errorText && (
                <motion.div initial={{ opacity: 0, height: 0, scale: 0.9 }} animate={{ opacity: 1, height: 'auto', scale: 1 }} exit={{ opacity: 0, height: 0, scale: 0.9 }} className="bg-red-50/80 backdrop-blur-md text-red-600 text-xs font-semibold p-3 rounded-xl flex items-center gap-2 border border-red-100/50">
                  <AlertCircle size={14} /> {errorText}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" size={16} />
                <input 
                  type="text" required placeholder="Inisial (Contoh: IND, IBL)" 
                  value={initial} onChange={(e) => setInitial(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all duration-300 text-sm text-slate-700 font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" size={16} />
                <input 
                  type="password" required placeholder="Password" 
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all duration-300 text-sm text-slate-700 font-medium placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.01, boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.3)" }} whileTap={{ scale: 0.97 }} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 mt-6 bg-blue-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-70 text-sm">
              {isLoading ? <><Loader2 className="animate-spin" size={16} /> Menyambungkan...</> : <>Masuk <ArrowRight size={16} /></>}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}