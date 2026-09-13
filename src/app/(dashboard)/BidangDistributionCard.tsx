// src/app/(dashboard)/BidangDistributionCard.tsx
"use client";

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Info } from 'lucide-react';
import DonutChart, { type DonutSlice } from '@/src/components/charts/DonutChart';
import type { BidangBreakdown, BidangPeriod } from '@/src/lib/dashboardStats';

const PERIOD_OPTIONS: { key: BidangPeriod; label: string }[] = [
  { key: 'month', label: 'Bulan ini' },
  { key: 'year', label: 'Tahun ini' },
  { key: 'all', label: 'Semua' },
];

export default function BidangDistributionCard({
  initialData,
  canDrilldown,
}: {
  initialData: BidangBreakdown;
  canDrilldown: boolean;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<BidangPeriod>(initialData.period);
  const [data, setData] = useState<BidangBreakdown>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Cache per periode supaya toggle bolak-balik tidak fetch ulang, dan supaya kembali ke
  // periode awal tidak perlu request sama sekali. requestId mencegah race condition kalau
  // user klik cepat antar periode (respons yang telat diabaikan).
  const cacheRef = useRef<Partial<Record<BidangPeriod, BidangBreakdown>>>({ [initialData.period]: initialData });
  const requestIdRef = useRef(0);

  const handlePeriodChange = (next: BidangPeriod) => {
    setPeriod(next);

    const cached = cacheRef.current[next];
    if (cached) {
      setData(cached);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    fetch(`/api/dashboard/bidang?period=${next}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((fetched: BidangBreakdown) => {
        if (requestIdRef.current !== requestId) return; // ada request lebih baru, abaikan
        cacheRef.current[next] = fetched;
        setData(fetched);
      })
      .catch((err) => console.error('Gagal memuat distribusi bidang:', err))
      .finally(() => {
        if (requestIdRef.current === requestId) setIsLoading(false);
      });
  };

  const handleSliceClick = (slice: DonutSlice) => {
    if (!canDrilldown) return;
    router.push(`/tickets?kategori=${encodeURIComponent(slice.key)}`);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <PieChart size={16} className="text-indigo-500" />
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distribusi Tiket per Bidang</h3>
        </div>
        <div className="flex bg-slate-50/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar border border-slate-100/50">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handlePeriodChange(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                period === opt.key ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-4">
        <Info size={12} />
        Mencakup seluruh departemen, bukan hanya lingkup Anda.
      </p>

      <div className={`transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        <DonutChart
          slices={data.slices}
          centerValue={data.total}
          centerLabel="Tiket"
          ariaLabel={`Distribusi tiket per bidang, ${data.total} tiket total: ${data.slices
            .map((s) => `${s.label} ${s.value} tiket`)
            .join(', ')}`}
          onSliceClick={canDrilldown ? handleSliceClick : undefined}
          renderSliceExtra={(s) => {
            const full = data.slices.find((x) => x.key === s.key);
            if (!full) return null;
            return (
              <p className="text-[10px] text-slate-400">
                {full.menunggu} menunggu &middot; {full.diproses} diproses &middot; {full.selesai} selesai
              </p>
            );
          }}
        />
      </div>

      {!canDrilldown && (
        <p className="mt-4 text-[10px] text-slate-400 italic">
          Klik untuk melihat daftar tiket tidak tersedia untuk role Anda, karena lingkup tiket Anda lebih sempit dari data di kartu ini.
        </p>
      )}
    </div>
  );
}
