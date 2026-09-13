// src/app/(dashboard)/TeamBacklogSection.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, ChevronDown, AlertTriangle, Send, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TeamBacklog, MemberBacklog, UnassignedBacklog, TicketSummary } from '@/src/lib/teamOversight';

function daysAgoLabel(iso: string | null): string {
  if (!iso) return '-';
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days === 0) return 'Hari ini';
  if (days === 1) return '1 hari lalu';
  return `${days} hari lalu`;
}

function statusBadgeClass(status: string) {
  if (status === 'IN_PROGRESS') return 'bg-amber-50 text-amber-600 border-amber-100';
  return 'bg-blue-50 text-blue-600 border-blue-100';
}

function TicketRows({ tickets }: { tickets: TicketSummary[] }) {
  const router = useRouter();
  return (
    <div className="space-y-2 pt-3 border-t border-slate-100 mt-3">
      {tickets.map((t) => (
        <div
          key={t.id}
          onClick={() => router.push(`/tickets/${t.id}`)}
          className="flex items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 cursor-pointer transition-colors"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black text-indigo-600">{t.ticketNumber}</span>
              <span className={`px-1.5 py-0.5 text-[9px] font-black rounded border ${statusBadgeClass(t.status)}`}>{t.status.replace('_', ' ')}</span>
            </div>
            <p className="text-xs font-bold text-slate-700 truncate">{t.title}</p>
            <p className="text-[10px] text-slate-400 font-medium">{t.branch}</p>
          </div>
          <ExternalLink size={14} className="text-slate-400 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function MemberRow({ member, showBidang }: { member: MemberBacklog; showBidang: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);

  const handleRemind = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/team-oversight/contact/${member.id}`);
      const data = await res.json();
      if (!res.ok || !data.email) {
        toast.error(`Email Teams ${member.name} belum terdaftar.`);
        return;
      }
      const text = `Halo ${member.name}, mohon cek kembali tiket yang masih menunggu/diproses (${member.menunggu + member.diproses} tiket, ${member.lewatSla} lewat SLA). Terima kasih!`;
      window.open(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(data.email)}&message=${encodeURIComponent(text)}`, '_blank');
    } catch {
      toast.error('Gagal mengambil kontak Teams.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-3 bg-white">
        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">{member.initial}</div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">{member.name}</p>
            {showBidang && <p className="text-[10px] text-slate-400 font-medium">{member.bidang}</p>}
          </div>
        </button>

        <div className="flex items-center gap-2 text-[10px] font-bold shrink-0">
          <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-md whitespace-nowrap">{member.menunggu} Menunggu</span>
          <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-1 rounded-md whitespace-nowrap">{member.diproses} Diproses</span>
          <span className={`px-2 py-1 rounded-md border whitespace-nowrap ${member.lewatSla > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{member.lewatSla} Lewat SLA</span>
          <span className="hidden sm:inline text-slate-400 font-medium whitespace-nowrap">Tertua: {daysAgoLabel(member.tertua)}</span>
        </div>

        <button
          onClick={handleRemind}
          disabled={sending}
          title="Ingatkan via Teams"
          className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 transition-colors shrink-0 disabled:opacity-50"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>

        <button onClick={() => setExpanded((v) => !v)} className="p-1 text-slate-400 shrink-0">
          <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 bg-white">
              <TicketRows tickets={member.tickets} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UnassignedRow({ group }: { group: UnassignedBacklog }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-dashed border-amber-200 rounded-xl overflow-hidden bg-amber-50/40">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between gap-3 p-3 text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={14} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">Belum di-assign &mdash; {group.bidang}</p>
            <p className="text-[10px] text-slate-400 font-medium">Tertua: {daysAgoLabel(group.tertua)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className={`px-2 py-1 rounded-md border ${group.lewatSla > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-500 border-slate-200'}`}>{group.lewatSla} Lewat SLA</span>
          <span className="bg-white text-slate-600 border border-slate-200 px-2 py-1 rounded-md">{group.menunggu + group.diproses} Tiket</span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3">
              <TicketRows tickets={group.tickets} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TeamBacklogSection({ backlog }: { backlog: TeamBacklog }) {
  const isDepartemen = backlog.scope === 'DEPARTEMEN';
  const [bidangFilter, setBidangFilter] = useState<string>('ALL');

  const bidangOptions = useMemo(() => {
    const set = new Set<string>();
    backlog.members.forEach((m) => set.add(m.bidang));
    backlog.unassigned.forEach((u) => set.add(u.bidang));
    return Array.from(set);
  }, [backlog]);

  const filteredMembers = bidangFilter === 'ALL' ? backlog.members : backlog.members.filter((m) => m.bidang === bidangFilter);
  const filteredUnassigned = bidangFilter === 'ALL' ? backlog.unassigned : backlog.unassigned.filter((u) => u.bidang === bidangFilter);

  const isEmpty = backlog.summary.totalTiket === 0;

  return (
    <div id="team-backlog-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">Tiket Tim yang Belum Selesai</h3>
        </div>

        {isDepartemen && bidangOptions.length > 0 && (
          <select
            value={bidangFilter}
            onChange={(e) => setBidangFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-indigo-300"
          >
            <option value="ALL">Semua Bidang</option>
            {bidangOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Tiket</p>
          <p className="text-lg font-black text-slate-800">{backlog.summary.totalTiket}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Anggota Bermasalah</p>
          <p className="text-lg font-black text-slate-800">{backlog.summary.totalAnggotaBermasalah}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-1">Lewat SLA</p>
          <p className="text-lg font-black text-red-600">{backlog.summary.totalLewatSla}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Belum Di-assign</p>
          <p className="text-lg font-black text-slate-800">{backlog.summary.belumDiassign}</p>
        </div>
      </div>

      {isEmpty ? (
        <div className="text-center py-8 text-slate-400 font-medium text-sm border-2 border-dashed border-slate-100 rounded-xl">
          Semua tiket tim sudah ditangani.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((m) => (
            <MemberRow key={m.id} member={m} showBidang={isDepartemen} />
          ))}
          {filteredUnassigned.map((u) => (
            <UnassignedRow key={u.bidang} group={u} />
          ))}
        </div>
      )}
    </div>
  );
}
