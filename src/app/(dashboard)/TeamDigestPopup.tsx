// src/app/(dashboard)/TeamDigestPopup.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, AlertTriangle } from 'lucide-react';
import type { TeamBacklogSummary } from '@/src/lib/teamOversight';

export interface DigestTopMember {
  name: string;
  initial: string;
  total: number;
  lewatSla: number;
}

interface TeamDigestPopupProps {
  open: boolean;
  onClose: () => void;
  onViewAll: () => void;
  summary: TeamBacklogSummary;
  topMembers: DigestTopMember[];
}

export default function TeamDigestPopup({ open, onClose, onViewAll, summary, topMembers }: TeamDigestPopupProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else {
      previouslyFocused.current?.focus();
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-digest-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden outline-none"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                <h3 id="team-digest-title" className="font-black text-slate-800 text-sm">Tiket tim yang belum selesai</h3>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors" aria-label="Tutup">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Tiket</p>
                  <p className="text-lg font-black text-slate-800">{summary.totalTiket}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Anggota Terdampak</p>
                  <p className="text-lg font-black text-slate-800">{summary.totalAnggotaBermasalah}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-1">Lewat SLA</p>
                  <p className="text-lg font-black text-red-600">{summary.totalLewatSla}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Belum Di-assign</p>
                  <p className="text-lg font-black text-slate-800">{summary.belumDiassign}</p>
                </div>
              </div>

              {topMembers.length > 0 && (
                <div className="space-y-1.5">
                  {topMembers.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0">{m.initial}</div>
                        <span className="text-xs font-bold text-slate-700 truncate">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500">{m.total} tiket</span>
                        {m.lewatSla > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                            <AlertTriangle size={10} /> {m.lewatSla}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm border border-slate-200">
                  Tutup
                </button>
                <button onClick={onViewAll} className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors text-sm">
                  Lihat semua di dashboard
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
