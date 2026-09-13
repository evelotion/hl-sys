// src/lib/tvStats.ts
// Data untuk Mode TV. Semua perhitungan tanggal pakai WIB (UTC+7) secara eksplisit,
// karena server Vercel jalan di UTC.
//
// SENGAJA TIDAK ADA DATA SLA DI SINI (deadline, % SLA, prioritas), maupun kontak
// pribadi (HP, email). TV bisa dilihat orang di luar Logistik, jadi field-field itu
// tidak boleh ikut tampil.
import { db } from '@/src/lib/db';
import { startOfWibDay, startOfWibMonth, wibDayKey } from '@/src/lib/time';
import { isAssignable } from '@/src/lib/roles';

export const TV_CONFIG = {
  trendDays: 14,            // panjang grafik harian
  latestCount: 8,           // jumlah tiket di slide "Tiket terbaru"
  branchTop: 10,            // jumlah cabang di leaderboard
  staffTop: 10,             // jumlah staf di leaderboard
  // Total tiket selesai (sepanjang waktu) yang dirayakan
  milestoneTargets: [10, 25, 50, 100, 150, 200, 300, 500, 1000],
  // Ucapan selamat tetap tayang selama N hari sejak tercapai (hari ini + 2 hari sebelumnya)
  milestoneWindowDays: 3,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeBranch(name: string | null): string {
  const clean = (name || '').trim().replace(/\s+/g, ' ').toUpperCase();
  return clean || 'TIDAK DIKETAHUI';
}

export type TvTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface TvData {
  generatedAt: string;
  periodLabel: string; // contoh: "September 2026"
  today: { masuk: number; selesai: number; menunggu: number; diproses: number };
  trend: { date: string; label: string; masuk: number; selesai: number; isToday: boolean; isWeekend: boolean }[];
  monthTotal: number;
  categories: { name: string; count: number }[];
  branchCount: number;
  branches: { name: string; count: number; selesai: number }[];
  latest: {
    id: string;
    ticketNumber: string;
    title: string;
    branch: string;
    category: string;
    status: TvTicketStatus;
    picName: string | null;
    picInitial: string | null;
    createdAt: string;
  }[];
  staff: { rank: number; name: string; initial: string; count: number }[];
  milestones: { name: string; initial: string; target: number; reachedAt: string }[];
}

export async function getTvData(): Promise<TvData> {
  const now = new Date();
  const todayStart = startOfWibDay(now);
  const monthStart = startOfWibMonth(now);
  const trendStart = new Date(todayStart.getTime() - (TV_CONFIG.trendDays - 1) * DAY_MS);
  const milestoneFrom = new Date(todayStart.getTime() - (TV_CONFIG.milestoneWindowDays - 1) * DAY_MS);

  const [
    menunggu,
    diproses,
    masukHariIni,
    selesaiHariIni,
    trendCreated,
    trendDone,
    monthTickets,
    latest,
    staffGroups,
    doneAllTime,
  ] = await Promise.all([
    db.ticket.count({ where: { status: 'OPEN' } }),
    db.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    db.ticket.count({ where: { createdAt: { gte: todayStart } } }),
    db.ticket.count({ where: { status: 'DONE', resolvedAt: { gte: todayStart } } }),
    db.ticket.findMany({ where: { createdAt: { gte: trendStart } }, select: { createdAt: true } }),
    db.ticket.findMany({ where: { status: 'DONE', resolvedAt: { gte: trendStart } }, select: { resolvedAt: true } }),
    db.ticket.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { branchName: true, category: true, status: true },
    }),
    db.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: TV_CONFIG.latestCount,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        branchName: true,
        category: true,
        status: true,
        createdAt: true,
        pic: { select: { name: true, initial: true } }, // hanya nama & inisial, tanpa kontak/password
      },
    }),
    db.ticket.groupBy({
      by: ['picId'],
      where: { status: 'DONE', resolvedAt: { gte: monthStart }, picId: { not: null } },
      _count: { picId: true },
      orderBy: { _count: { picId: 'desc' } },
      take: TV_CONFIG.staffTop,
    }),
    db.ticket.findMany({
      where: { status: 'DONE', picId: { not: null }, resolvedAt: { not: null } },
      select: { picId: true, resolvedAt: true },
      orderBy: { resolvedAt: 'asc' },
    }),
  ]);

  // --- Tren harian (WIB) ---
  const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
  const todayKey = wibDayKey(now);
  const trendMap = new Map<string, { masuk: number; selesai: number }>();
  const trend: TvData['trend'] = [];
  for (let i = 0; i < TV_CONFIG.trendDays; i++) {
    const key = wibDayKey(new Date(trendStart.getTime() + i * DAY_MS));
    const noon = new Date(`${key}T12:00:00Z`);
    const dow = noon.getUTCDay();
    const bucket = { masuk: 0, selesai: 0 };
    trendMap.set(key, bucket);
    trend.push({ date: key, label: dayFmt.format(noon), masuk: 0, selesai: 0, isToday: key === todayKey, isWeekend: dow === 0 || dow === 6 });
  }
  for (const t of trendCreated) {
    const b = trendMap.get(wibDayKey(t.createdAt));
    if (b) b.masuk++;
  }
  for (const t of trendDone) {
    if (!t.resolvedAt) continue;
    const b = trendMap.get(wibDayKey(t.resolvedAt));
    if (b) b.selesai++;
  }
  for (const d of trend) {
    const b = trendMap.get(d.date)!;
    d.masuk = b.masuk;
    d.selesai = b.selesai;
  }

  // --- Kategori & cabang bulan ini ---
  const catMap = new Map<string, number>();
  const branchMap = new Map<string, { count: number; selesai: number }>();
  for (const t of monthTickets) {
    const cat = t.category?.trim() || 'Lainnya';
    catMap.set(cat, (catMap.get(cat) || 0) + 1);

    const name = normalizeBranch(t.branchName);
    const b = branchMap.get(name) || { count: 0, selesai: 0 };
    b.count++;
    if (t.status === 'DONE') b.selesai++;
    branchMap.set(name, b);
  }
  const categories = [...catMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const branches = [...branchMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count || b.selesai - a.selesai || a.name.localeCompare(b.name))
    .slice(0, TV_CONFIG.branchTop);

  // --- Milestone (total tiket selesai sepanjang waktu) ---
  const donePerPic = new Map<string, Date[]>();
  for (const t of doneAllTime) {
    if (!t.picId || !t.resolvedAt) continue;
    const arr = donePerPic.get(t.picId) || [];
    arr.push(t.resolvedAt);
    donePerPic.set(t.picId, arr);
  }
  const rawMilestones: { picId: string; target: number; reachedAt: Date }[] = [];
  for (const [picId, dates] of donePerPic) {
    let best: { picId: string; target: number; reachedAt: Date } | null = null;
    for (const target of TV_CONFIG.milestoneTargets) {
      if (dates.length < target) break;
      const reachedAt = dates[target - 1];
      if (reachedAt >= milestoneFrom) best = { picId, target, reachedAt };
    }
    if (best) rawMilestones.push(best);
  }
  rawMilestones.sort((a, b) => b.reachedAt.getTime() - a.reachedAt.getTime());

  // --- Ambil nama & inisial staf (hanya kolom yang aman), dibatasi ke user yang bisa
  // di-assign. VIEWER (dan role lain yang bukan PIC/OPERATOR/KEPALA_BIDANG) tidak boleh
  // pernah muncul di leaderboard atau milestone. ---
  const userIds = [
    ...new Set([
      ...staffGroups.map((g) => g.picId).filter((id): id is string => !!id),
      ...rawMilestones.map((m) => m.picId),
    ]),
  ];
  const users = userIds.length
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, initial: true, role: true } })
    : [];
  const userMap = new Map(users.filter((u) => isAssignable(u)).map((u) => [u.id, u]));

  let prevCount = -1;
  let rank = 0;
  const staff = staffGroups
    .filter((g) => g.picId && userMap.has(g.picId))
    .map((g, i) => {
      const count = g._count.picId;
      if (count !== prevCount) {
        rank = i + 1;
        prevCount = count;
      }
      const u = userMap.get(g.picId!)!;
      return { rank, name: u.name, initial: u.initial, count };
    });

  const milestones = rawMilestones
    .filter((m) => userMap.has(m.picId))
    .map((m) => {
      const u = userMap.get(m.picId)!;
      return { name: u.name, initial: u.initial, target: m.target, reachedAt: m.reachedAt.toISOString() };
    });

  return {
    generatedAt: now.toISOString(),
    periodLabel: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(now),
    today: { masuk: masukHariIni, selesai: selesaiHariIni, menunggu, diproses },
    trend,
    monthTotal: monthTickets.length,
    categories,
    branchCount: branchMap.size,
    branches,
    latest: latest.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      branch: normalizeBranch(t.branchName),
      category: t.category,
      status: t.status as TvTicketStatus,
      picName: t.pic?.name ?? null,
      picInitial: t.pic?.initial ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
    staff,
    milestones,
  };
}
