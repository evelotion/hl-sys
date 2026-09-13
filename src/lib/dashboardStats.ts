// src/lib/dashboardStats.ts
// Data untuk kartu "Distribusi tiket per bidang" di dashboard (Fase 4).
// Lingkup SELALU seluruh departemen (K4), untuk semua role termasuk VIEWER.
// TIDAK ADA field SLA di sini sama sekali.
import { db } from '@/src/lib/db';
import { startOfWibMonth, startOfWibYear } from '@/src/lib/time';
import { BIDANG, bidangOfCategory, type BidangName } from '@/src/lib/roles';

export type BidangPeriod = 'month' | 'year' | 'all';

const BIDANG_COLORS: Record<BidangName, string> = {
  P3: '#0066B3',
  Pengadaan: '#00A6B6',
  Pembayaran: '#00AAFF',
  Lainnya: '#94A3B8',
};

export interface BidangBreakdownSlice {
  key: BidangName;
  label: string;
  value: number;
  color: string;
  menunggu: number;
  diproses: number;
  selesai: number;
}

export interface BidangBreakdown {
  period: BidangPeriod;
  total: number;
  slices: BidangBreakdownSlice[];
}

export async function getBidangBreakdown(period: BidangPeriod): Promise<BidangBreakdown> {
  const now = new Date();

  const where =
    period === 'month'
      ? { createdAt: { gte: startOfWibMonth(now) } }
      : period === 'year'
        ? { createdAt: { gte: startOfWibYear(now) } }
        : {};

  const tickets = await db.ticket.findMany({ where, select: { category: true, status: true } });

  const buckets = new Map<BidangName, { menunggu: number; diproses: number; selesai: number; total: number }>();
  for (const bidang of Object.values(BIDANG)) {
    buckets.set(bidang, { menunggu: 0, diproses: 0, selesai: 0, total: 0 });
  }

  for (const t of tickets) {
    const bidang = bidangOfCategory(t.category);
    const b = buckets.get(bidang)!;
    b.total++;
    if (t.status === 'OPEN') b.menunggu++;
    else if (t.status === 'IN_PROGRESS') b.diproses++;
    else if (t.status === 'DONE') b.selesai++;
  }

  const slices: BidangBreakdownSlice[] = (Object.values(BIDANG) as BidangName[]).map((bidang) => {
    const b = buckets.get(bidang)!;
    return {
      key: bidang,
      label: bidang,
      value: b.total,
      color: BIDANG_COLORS[bidang],
      menunggu: b.menunggu,
      diproses: b.diproses,
      selesai: b.selesai,
    };
  });

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return { period, total, slices };
}
