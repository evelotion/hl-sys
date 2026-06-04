// hl-sys/src/app/(auth)/login/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  
  // State input
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');

  // Otomatis isi form kalau ada parameter nip dan pwd di URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nipParam = params.get('nip');
    const pwdParam = params.get('pwd');

    if (nipParam) setNip(nipParam);
    if (pwdParam) setPassword(pwdParam);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorText('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip, password })
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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Light Ambient Background */}
      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/50 rounded-full blur-[100px] pointer-events-none" />
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 10, repeat: Infinity, delay: 1 }} className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[360px] relative z-10">
        <div className="bg-white/80 backdrop-blur-2xl rounded-[24px] p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
          
          <div className="text-center mb-8">
            <motion.div whileHover={{ rotate: 10, scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }} className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50 mb-5">
              <Lock size={24} strokeWidth={2.5} />
            </motion.div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">HL-SYS</h1>
            <p className="text-slate-400 font-bold mt-1 text-[10px] uppercase tracking-[0.2em]">Departemen Logistik</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <AnimatePresence>
              {errorText && (
                <motion.div initial={{ opacity: 0, height: 0, scale: 0.9 }} animate={{ opacity: 1, height: 'auto', scale: 1 }} exit={{ opacity: 0, height: 0, scale: 0.9 }} className="bg-red-50 text-red-600 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 border border-red-100 shadow-sm">
                  <AlertCircle size={16} /> {errorText}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Initial</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" size={16} />
                <input 
                  type="text" required placeholder="NIP / Email" 
                  value={nip} onChange={(e) => setNip(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all duration-300 text-sm text-slate-700 font-medium placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-300" size={18} />
                <input 
                  type="password" required placeholder="••••••••" 
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all duration-300 text-sm text-slate-800 font-bold placeholder:text-slate-400 placeholder:font-medium shadow-sm"
                />
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold rounded-xl shadow-[0_8px_20px_rgb(79,70,229,0.25)] hover:shadow-[0_12px_25px_rgb(79,70,229,0.35)] transition-all duration-300 disabled:opacity-70 text-sm">
              {isLoading ? <><Loader2 className="animate-spin" size={18} /> Menyambungkan...</> : <>Masuk Sistem <ArrowRight size={18} /></>}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}