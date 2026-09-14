// src/app/tv/TvDisplayClient.tsx
"use client";

import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, Maximize, Minimize, Package, Pause, Play, WifiOff } from 'lucide-react';
import type { TvData, TvTicketStatus } from '@/src/lib/tvStats';
import { wibDayDiff, wibDayKey as wibKey } from '@/src/lib/time';

/* ============================================================
   KONFIGURASI
   ============================================================ */
const STAGE_W = 1920;          // semua layout didesain di kanvas 1920x1080, lalu di-scale ke layar
const STAGE_H = 1080;
const POLL_MS = 30_000;        // ambil data baru tiap 30 detik
const TICK_MS = 250;
const IDLE_MS = 3_000;         // tombol kontrol sembunyi setelah 3 detik tanpa gerakan mouse
const NEW_BADGE_MIN = 60;      // tiket dianggap "Baru" selama 60 menit
const BANNER_MS = 12_000;      // lama banner "Tiket baru masuk"

// Palet resmi BCA Syariah
const BRAND = {
  deep: '#0066B3',   // Deep Horizon
  tide: '#00A6B6',   // Fresh Tide
  sky: '#00AAFF',    // Clear Sky
  glow: '#FFE600',   // Morning Glow
  base: '#00355F',   // Deep Horizon digelapkan untuk latar TV
  ink: '#002A4C',
  danger: '#FF6B6B', // Bukan warna resmi brand -- aksen merah untuk umur tiket kritis, dipilih agar tetap terbaca (teks gelap di atasnya, kontras terhadap latar #00355F)
};

type SlideKey = 'ringkasan' | 'cabang' | 'terbaru' | 'terlama' | 'selamat';

const SLIDES: Record<SlideKey, { title: string; short: string; duration: number }> = {
  ringkasan: { title: 'Ringkasan tiket', short: 'Ringkasan', duration: 20_000 },
  cabang: { title: 'Cabang & unit kerja teraktif', short: 'Cabang & unit', duration: 15_000 },
  terbaru: { title: 'Tiket terbaru', short: 'Tiket terbaru', duration: 15_000 },
  terlama: { title: 'Tiket terlama belum selesai', short: 'Tiket terlama', duration: 15_000 },
  selamat: { title: 'Apresiasi pencapaian', short: 'Apresiasi', duration: 15_000 },
};

const STATUS_LABEL: Record<TvTicketStatus, string> = {
  OPEN: 'Menunggu',
  IN_PROGRESS: 'Diproses',
  DONE: 'Selesai',
};

/* ============================================================
   HELPER WAKTU (selalu WIB) — wibKey diimpor dari src/lib/time.ts (wibDayKey)
   supaya hasilnya konsisten dengan helper WIB yang dipakai fitur lain.
   ============================================================ */
const fmtTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
const fmtDayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
const fmtLongDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const fmtWeekdayDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
const fmtShortDate = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });

function relativeDay(iso: string, now: Date, short = false): string {
  const d = new Date(iso);
  const today = wibKey(now);
  const yesterday = wibKey(new Date(now.getTime() - 86_400_000));
  const key = wibKey(d);
  if (key === today) return 'hari ini';
  if (key === yesterday) return 'kemarin';
  return short ? fmtShortDate.format(d) : `pada ${fmtWeekdayDate.format(d)}`;
}

function useNow(intervalMs: number): Date | null {
  // null saat render server, supaya tidak terjadi hydration mismatch
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const first = setTimeout(update, 0);
    const id = setInterval(update, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}

/* ============================================================
   STATE SLIDE
   ============================================================ */
type Pos = { index: number; elapsed: number };
type PosAction =
  | { type: 'tick'; slides: SlideKey[] }
  | { type: 'go'; delta: number; count: number };

function posReducer(state: Pos, action: PosAction): Pos {
  if (action.type === 'go') {
    const n = action.count;
    return { index: (((state.index % n) + action.delta) % n + n) % n, elapsed: 0 };
  }
  const n = action.slides.length;
  const current = action.slides[state.index % n];
  const elapsed = state.elapsed + TICK_MS;
  if (elapsed >= SLIDES[current].duration) return { index: ((state.index % n) + 1) % n, elapsed: 0 };
  return { index: state.index, elapsed };
}

/* ============================================================
   KOMPONEN UTAMA
   ============================================================ */
export default function TvDisplayClient({ initialData }: { initialData: TvData | null }) {
  const router = useRouter();
  const [data, setData] = useState<TvData | null>(initialData);
  const [conn, setConn] = useState<'live' | 'stale' | 'expired'>('live');
  const [lastOk, setLastOk] = useState<string | null>(initialData?.generatedAt ?? null);
  const [newTicket, setNewTicket] = useState<TvData['latest'][number] | null>(null);
  const knownIds = useRef<Set<string>>(new Set(initialData?.latest.map((t) => t.id) ?? []));

  const [paused, setPaused] = useState(false);
  const [pos, dispatch] = useReducer(posReducer, { index: 0, elapsed: 0 });
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const now = useNow(30_000);

  // Slide "Selamat" hanya muncul kalau memang ada yang perlu diberi selamat.
  // useMemo supaya referensi array (dan .length) stabil antar render selama
  // hasMilestones tidak berubah, dipakai sebagai dependency stabil oleh `go` di bawah.
  const hasMilestones = (data?.milestones.length ?? 0) > 0;
  const slides: SlideKey[] = useMemo(
    () => (hasMilestones ? ['ringkasan', 'cabang', 'terbaru', 'terlama', 'selamat'] : ['ringkasan', 'cabang', 'terbaru', 'terlama']),
    [hasMilestones]
  );
  const slideIndex = pos.index % slides.length;
  const current = slides[slideIndex];
  const progress = Math.min(1, pos.elapsed / SLIDES[current].duration);

  // --- Rotasi slide otomatis ---
  const slidesSig = slides.join(',');
  useEffect(() => {
    if (paused) return;
    const list = slidesSig.split(',') as SlideKey[];
    const id = setInterval(() => dispatch({ type: 'tick', slides: list }), TICK_MS);
    return () => clearInterval(id);
  }, [paused, slidesSig]);

  const go = useCallback((delta: number) => dispatch({ type: 'go', delta, count: slides.length }), [slides.length]);

  // --- Polling data live ---
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/tv', { cache: 'no-store' });
        if (res.status === 401) {
          if (!cancelled) setConn('expired');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next: TvData = await res.json();
        if (cancelled) return;

        const fresh = next.latest.filter((t) => !knownIds.current.has(t.id));
        if (knownIds.current.size > 0 && fresh.length > 0) setNewTicket(fresh[0]);
        knownIds.current = new Set(next.latest.map((t) => t.id));

        setData(next);
        setConn('live');
        setLastOk(next.generatedAt);
      } catch (err) {
        console.error('Gagal memuat data TV:', err);
        if (!cancelled) setConn((c) => (c === 'expired' ? c : 'stale'));
      }
    };
    const first = initialData ? null : setTimeout(load, 0);
    const id = setInterval(load, POLL_MS);
    window.addEventListener('online', load);
    return () => {
      cancelled = true;
      if (first) clearTimeout(first);
      clearInterval(id);
      window.removeEventListener('online', load);
    };
  }, [initialData]);

  // Banner tiket baru hilang sendiri
  useEffect(() => {
    if (!newTicket) return;
    const t = setTimeout(() => setNewTicket(null), BANNER_MS);
    return () => clearTimeout(t);
  }, [newTicket]);

  // --- Skala kanvas 1920x1080 agar pas di layar apa pun ---
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    const first = setTimeout(fit, 0);
    window.addEventListener('resize', fit);
    return () => {
      clearTimeout(first);
      window.removeEventListener('resize', fit);
    };
  }, []);

  // --- Fullscreen ---
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    const first = setTimeout(sync, 0);
    document.addEventListener('fullscreenchange', sync);
    return () => {
      clearTimeout(first);
      document.removeEventListener('fullscreenchange', sync);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error('Fullscreen gagal:', err);
    }
  }, []);

  const exitTv = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* abaikan */
    }
    router.push('/');
  }, [router]);

  // --- Cegah layar laptop/TV tidur (Screen Wake Lock) ---
  useEffect(() => {
    type WakeLockSentinelLike = { release: () => Promise<void> };
    type WakeLockLike = { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    let lock: WakeLockSentinelLike | null = null;
    const request = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
        if (wl && document.visibilityState === 'visible') lock = await wl.request('screen');
      } catch {
        /* browser tidak mendukung atau ditolak, tidak masalah */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  // --- Tombol kontrol muncul saat mouse bergerak ---
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const poke = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowControls(false), IDLE_MS);
    };
    timer = setTimeout(() => setShowControls(false), IDLE_MS);
    window.addEventListener('mousemove', poke);
    window.addEventListener('touchstart', poke);
    window.addEventListener('keydown', poke);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', poke);
      window.removeEventListener('touchstart', poke);
      window.removeEventListener('keydown', poke);
    };
  }, []);

  // --- Keyboard: ← → pindah slide, spasi jeda, F layar penuh ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, toggleFullscreen]);

  const isCelebration = current === 'selamat';

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden text-white transition-colors duration-1000 ${showControls ? '' : 'cursor-none'}`}
      style={{ backgroundColor: isCelebration ? BRAND.deep : BRAND.base, colorScheme: 'dark' }}
    >
      {/* Kanvas 1920x1080 */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center' }}
      >
        <TvHeader
          title={SLIDES[current].title}
          subtitle={subtitleFor(current, data, now)}
          conn={conn}
          lastOk={lastOk}
          newTicket={newTicket}
        />

        <main className="absolute" style={{ left: 72, right: 72, top: 204, bottom: 128 }}>
          {!data ? (
            <EmptyState text="Menyiapkan data tiket…" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {current === 'ringkasan' && <SlideRingkasan data={data} />}
                {current === 'cabang' && <SlideCabang data={data} />}
                {current === 'terbaru' && <SlideTerbaru data={data} now={now} />}
                {current === 'terlama' && <SlideTerlama data={data} now={now} />}
                {current === 'selamat' && <SlideSelamat data={data} now={now} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <TvFooter slides={slides} activeIndex={slideIndex} progress={progress} paused={paused} />
      </div>

      {/* Kontrol (ukuran normal, tidak ikut di-scale) */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-md px-2 py-2 shadow-lg transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <ControlButton label="Slide sebelumnya (←)" onClick={() => go(-1)}><ChevronLeft size={22} /></ControlButton>
        <ControlButton label={paused ? 'Lanjutkan (spasi)' : 'Jeda (spasi)'} onClick={() => setPaused((p) => !p)}>
          {paused ? <Play size={22} /> : <Pause size={22} />}
        </ControlButton>
        <ControlButton label="Slide berikutnya (→)" onClick={() => go(1)}><ChevronRight size={22} /></ControlButton>
        <span className="mx-1 h-6 w-px bg-white/25" />
        <ControlButton label={isFullscreen ? 'Keluar layar penuh (F)' : 'Layar penuh (F)'} onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
        </ControlButton>
        <ControlButton label="Keluar dari Mode TV" onClick={exitTv}><LogOut size={22} /></ControlButton>
      </div>

      {/* Sesi habis: TV tidak bisa ambil data baru */}
      {conn === 'expired' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="max-w-xl rounded-3xl bg-white p-10 text-center text-slate-800 shadow-2xl">
            <h2 className="text-2xl font-bold">Sesi login di perangkat ini sudah berakhir</h2>
            <p className="mt-3 text-slate-600">
              Data di layar berhenti diperbarui. Login ulang di perangkat ini, lalu buka Mode TV lagi.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 rounded-xl px-6 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2"
              style={{ backgroundColor: BRAND.deep }}
            >
              Login ulang
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function subtitleFor(slide: SlideKey, data: TvData | null, now: Date | null): string {
  if (!data) return '';
  switch (slide) {
    case 'ringkasan':
      return now ? `Hari ini, ${fmtLongDate.format(now)}` : '';
    case 'cabang':
      return `${data.periodLabel}, dari ${data.branchCount} cabang dan unit kerja yang mengajukan tiket`;
    case 'terbaru':
      return `${data.latest.length} tiket yang paling baru masuk`;
    case 'terlama':
      return `${data.oldest.length} tiket yang paling lama menunggu penyelesaian`;
    case 'selamat':
      return 'Staf yang baru mencapai target total tiket selesai';
  }
}

/* ============================================================
   HEADER & FOOTER
   ============================================================ */
function TvHeader({
  title,
  subtitle,
  conn,
  lastOk,
  newTicket,
}: {
  title: string;
  subtitle: string;
  conn: 'live' | 'stale' | 'expired';
  lastOk: string | null;
  newTicket: TvData['latest'][number] | null;
}) {
  return (
    <header className="absolute flex items-start justify-between" style={{ left: 72, right: 72, top: 40, height: 136 }}>
      <div className="relative h-full min-w-0 flex-1 pr-16">
        <AnimatePresence mode="wait" initial={false}>
          {newTicket ? (
            <motion.div
              key="banner"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="absolute inset-0 flex items-center gap-6 rounded-2xl pl-7 pr-8"
              style={{ backgroundColor: BRAND.glow, color: BRAND.ink }}
            >
              <Package size={60} strokeWidth={2.2} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-[26px] font-semibold leading-tight">Tiket baru masuk: {newTicket.ticketNumber}</p>
                <p className="truncate text-[38px] font-bold leading-tight">
                  {newTicket.title} <span className="font-medium opacity-70">dari {newTicket.branch}</span>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
              <p className="flex items-center gap-3 text-[22px] font-medium text-white/70">
                <Package size={26} style={{ color: BRAND.glow }} />
                Hotline Logistik BCA Syariah
              </p>
              <h1 className="truncate text-[52px] font-bold leading-[1.25] tracking-tight">{title}</h1>
              <p className="truncate text-[24px] text-white/65">{subtitle}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 text-right">
        <Clock />
        <ConnectionStatus conn={conn} lastOk={lastOk} />
      </div>
    </header>
  );
}

function Clock() {
  const now = useNow(1000);
  return (
    <p className="text-[64px] font-semibold leading-none tabular-nums" aria-live="off">
      {now ? fmtTime.format(now) : '--.--'}
    </p>
  );
}

function ConnectionStatus({ conn, lastOk }: { conn: 'live' | 'stale' | 'expired'; lastOk: string | null }) {
  const last = lastOk ? fmtTime.format(new Date(lastOk)) : '--.--';
  if (conn === 'live') {
    return (
      <p className="mt-3 flex items-center justify-end gap-2 text-[20px] text-white/70">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" style={{ backgroundColor: BRAND.tide }} />
          <span className="relative inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: BRAND.tide }} />
        </span>
        Live, diperbarui {last}
      </p>
    );
  }
  return (
    <p className="mt-3 flex items-center justify-end gap-2 text-[20px] font-semibold" style={{ color: BRAND.glow }}>
      <WifiOff size={20} />
      {conn === 'expired' ? 'Sesi berakhir' : 'Koneksi terputus'}, data pukul {last}
    </p>
  );
}

function TvFooter({ slides, activeIndex, progress, paused }: { slides: SlideKey[]; activeIndex: number; progress: number; paused: boolean }) {
  return (
    <footer className="absolute flex gap-6" style={{ left: 72, right: 72, bottom: 48, height: 48 }}>
      {slides.map((s, i) => {
        const fill = i < activeIndex ? 1 : i === activeIndex ? progress : 0;
        return (
          <div key={s} className="flex-1">
            <div className="h-[6px] overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full" style={{ width: `${fill * 100}%`, backgroundColor: i === activeIndex ? BRAND.glow : 'rgba(255,255,255,0.55)' }} />
            </div>
            <p className={`mt-3 text-[20px] ${i === activeIndex ? 'font-semibold text-white' : 'text-white/50'}`}>
              {SLIDES[s].short}
              {i === activeIndex && paused ? ' (dijeda)' : ''}
            </p>
          </div>
        );
      })}
    </footer>
  );
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-full p-3 text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
    >
      {children}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="max-w-3xl text-center text-[36px] text-white/60">{text}</p>
    </div>
  );
}

/* ============================================================
   SLIDE 1: RINGKASAN + GRAFIK LIVE
   ============================================================ */
const SlideRingkasan = memo(function SlideRingkasan({ data }: { data: TvData }) {
  const figures = [
    { label: 'Masuk hari ini', value: data.today.masuk, color: BRAND.sky },
    { label: 'Selesai hari ini', value: data.today.selesai, color: BRAND.tide },
    { label: 'Menunggu diproses', value: data.today.menunggu, color: '#FFFFFF' },
    { label: 'Sedang diproses', value: data.today.diproses, color: '#FFFFFF' },
  ];
  const maxCat = Math.max(1, ...data.categories.map((c) => c.count));

  return (
    <div className="flex h-full flex-col">
      {/* Angka utama dalam satu pita */}
      <div className="flex border-y border-white/15" style={{ height: 176 }}>
        {figures.map((f, i) => (
          <div key={f.label} className={`flex flex-1 flex-col justify-center px-10 ${i > 0 ? 'border-l border-white/15' : ''}`}>
            <p className="text-[96px] font-bold leading-none tabular-nums" style={{ color: f.color }}>{f.value}</p>
            <p className="mt-3 text-[26px] text-white/75">{f.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex min-h-0 flex-1 gap-14">
        {/* Grafik harian */}
        <div className="flex min-w-0 flex-[2] flex-col">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[30px] font-semibold">Tiket masuk dan selesai, {data.trend.length} hari terakhir</h2>
            <div className="flex gap-6 text-[22px] text-white/75">
              <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-sm" style={{ backgroundColor: BRAND.sky }} />Masuk</span>
              <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-sm" style={{ backgroundColor: BRAND.tide }} />Selesai</span>
            </div>
          </div>
          <div className="mt-4 min-h-0 flex-1">
            <TrendChart trend={data.trend} />
          </div>
        </div>

        {/* Kategori bulan ini */}
        <div className="flex flex-1 flex-col">
          <h2 className="text-[30px] font-semibold">Kategori, {data.periodLabel}</h2>
          <p className="mt-1 text-[22px] text-white/65">{data.monthTotal} tiket masuk bulan ini</p>
          <div className="mt-8 space-y-7">
            {data.categories.length === 0 && <p className="text-[26px] text-white/60">Belum ada tiket bulan ini.</p>}
            {data.categories.slice(0, 5).map((c) => (
              <div key={c.name}>
                <div className="flex items-baseline justify-between text-[28px]">
                  <span className="truncate pr-4">{c.name}</span>
                  <span className="font-bold tabular-nums">{c.count}</span>
                </div>
                <div className="mt-2 h-4 rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${(c.count / maxCat) * 100}%`, backgroundColor: BRAND.sky }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

function TrendChart({ trend }: { trend: TvData['trend'] }) {
  const W = 1160;
  const H = 420;
  const pad = { l: 56, r: 8, t: 36, b: 56 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const maxVal = Math.max(0, ...trend.map((d) => Math.max(d.masuk, d.selesai)));
  const step = Math.max(1, Math.ceil(maxVal / 4));
  const yMax = step * 4;
  const groupW = plotW / trend.length;
  const barW = Math.min(28, groupW * 0.34);
  const y = (v: number) => pad.t + plotH - (v / yMax) * plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Grafik tiket masuk dan selesai per hari">
      {[0, 1, 2, 3, 4].map((i) => {
        const v = step * i;
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
            <text x={pad.l - 14} y={y(v) + 7} textAnchor="end" fontSize={20} fill="rgba(255,255,255,0.55)">{v}</text>
          </g>
        );
      })}
      {trend.map((d, i) => {
        const gx = pad.l + i * groupW;
        const cx = gx + groupW / 2;
        const bars = [
          { v: d.masuk, color: BRAND.sky, x: cx - barW - 3 },
          { v: d.selesai, color: BRAND.tide, x: cx + 3 },
        ];
        return (
          <g key={d.date}>
            {d.isWeekend && <rect x={gx + 2} y={pad.t} width={groupW - 4} height={plotH} fill="rgba(255,255,255,0.04)" rx={6} />}
            {d.isToday && <rect x={gx + 2} y={pad.t - 30} width={groupW - 4} height={plotH + 30} fill="rgba(255,230,0,0.08)" stroke="rgba(255,230,0,0.5)" rx={8} />}
            {bars.map((b, j) => {
              const h = (b.v / yMax) * plotH;
              return (
                <g key={j}>
                  {b.v > 0 && <rect x={b.x} y={y(b.v)} width={barW} height={h} rx={4} fill={b.color} />}
                  {b.v > 0 && (
                    <text x={b.x + barW / 2} y={y(b.v) - 8} textAnchor="middle" fontSize={18} fontWeight={600} fill="#FFFFFF">{b.v}</text>
                  )}
                </g>
              );
            })}
            <text
              x={cx}
              y={H - pad.b + 34}
              textAnchor="middle"
              fontSize={19}
              fontWeight={d.isToday ? 700 : 400}
              fill={d.isToday ? BRAND.glow : 'rgba(255,255,255,0.6)'}
            >
              {d.isToday ? 'Hari ini' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================
   SLIDE 2: LEADERBOARD CABANG / UNIT KERJA
   ============================================================ */
const SlideCabang = memo(function SlideCabang({ data }: { data: TvData }) {
  if (data.branches.length === 0) {
    return <EmptyState text="Belum ada tiket bulan ini. Leaderboard terisi begitu tiket pertama masuk." />;
  }
  const max = Math.max(1, ...data.branches.map((b) => b.count));
  const rowH = Math.min(76, Math.floor(690 / data.branches.length));

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-end gap-8 text-[22px] text-white/75">
        <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-sm" style={{ backgroundColor: BRAND.tide }} />Sudah selesai</span>
        <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-sm bg-white/30" />Belum selesai</span>
      </div>
      <ol className="mt-4">
        {data.branches.map((b, i) => {
          const first = i === 0;
          return (
            <li key={b.name} className="flex items-center border-b border-white/10" style={{ height: rowH }}>
              <span className="w-[80px] text-[36px] font-bold tabular-nums" style={{ color: first ? BRAND.glow : 'rgba(255,255,255,0.55)' }}>{i + 1}</span>
              <span className={`w-[560px] truncate pr-6 text-[32px] ${first ? 'font-bold' : 'font-medium'}`}>{b.name}</span>
              <div className="relative h-[26px] flex-1 overflow-hidden rounded-full">
                <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${(b.count / max) * 100}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(b.selesai / max) * 100}%`, backgroundColor: BRAND.tide }} />
              </div>
              <span className="w-[260px] text-right">
                <span className="text-[34px] font-bold tabular-nums">{b.count}</span>
                <span className="text-[24px] text-white/65"> tiket, {b.selesai} selesai</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
});

/* ============================================================
   SLIDE 3: TIKET TERBARU
   ============================================================ */
function StatusPill({ status }: { status: TvTicketStatus }) {
  const style: Record<TvTicketStatus, React.CSSProperties> = {
    OPEN: { border: `2px solid ${BRAND.glow}`, color: BRAND.glow },
    IN_PROGRESS: { backgroundColor: BRAND.sky, color: BRAND.ink },
    DONE: { backgroundColor: BRAND.tide, color: BRAND.ink },
  };
  return (
    <span className="inline-block rounded-full px-5 py-1.5 text-[24px] font-semibold" style={style[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const TICKET_ROW_H = 115; // tinggi baris tabel tiket (Terbaru & Terlama) -- muat Perihal 2 baris @26px

// Ambang umur tiket untuk penanda visual di slide "Tiket terlama". Ini murni umur
// tiket sejak dibuat (hari kalender WIB), BUKAN status atau deadline SLA.
const AGE_CRITICAL_DAYS = 30; // >= ini: pil merah + garis aksen kiri
const AGE_WARNING_DAYS = 14;  // >= ini (dan < kritis): pil kuning (Morning Glow), tanpa aksen

const SlideTerbaru = memo(function SlideTerbaru({ data, now }: { data: TvData; now: Date | null }) {
  if (data.latest.length === 0) return <EmptyState text="Belum ada tiket yang tercatat." />;
  const todayKey = now ? wibKey(now) : '';

  return (
    <table className="w-full table-fixed border-collapse text-left">
      <colgroup>
        <col style={{ width: 210 }} />
        <col style={{ width: 270 }} />
        <col />
        <col style={{ width: 360 }} />
        <col style={{ width: 250 }} />
        <col style={{ width: 200 }} />
      </colgroup>
      <thead>
        <tr className="text-[22px] text-white/60">
          <th className="pb-4 font-medium">Masuk</th>
          <th className="pb-4 font-medium">No. tiket</th>
          <th className="pb-4 font-medium">Perihal</th>
          <th className="pb-4 font-medium">Cabang / unit</th>
          <th className="pb-4 font-medium">PIC</th>
          <th className="pb-4 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {data.latest.map((t) => {
          const created = new Date(t.createdAt);
          const isNew = !!now && now.getTime() - created.getTime() < NEW_BADGE_MIN * 60_000;
          const time = wibKey(created) === todayKey ? fmtTime.format(created) : `${fmtDayMonth.format(created)}, ${fmtTime.format(created)}`;
          return (
            <tr key={t.id} className="border-t border-white/12" style={{ height: TICKET_ROW_H }}>
              <td className="pr-4 pt-6 align-top text-[28px] tabular-nums">
                <span className="flex items-center gap-3">
                  {time}
                  {isNew && (
                    <span className="rounded-md px-2 py-0.5 text-[18px] font-bold" style={{ backgroundColor: BRAND.glow, color: BRAND.ink }}>Baru</span>
                  )}
                </span>
              </td>
              <td className="pr-4 pt-6 align-top text-[26px] font-semibold tabular-nums text-white/85">{t.ticketNumber}</td>
              <td className="pr-6 pt-6 align-top">
                <p className="line-clamp-2 text-[26px] font-semibold leading-snug">{t.title}</p>
              </td>
              <td className="truncate pr-4 pt-6 align-top text-[26px] text-white/85">{t.branch}</td>
              <td className="truncate pr-4 pt-6 align-top text-[26px] text-white/85">{t.picName ?? 'Belum ditentukan'}</td>
              <td className="pt-6 align-top"><StatusPill status={t.status} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});

/* ============================================================
   Pil umur tiket -- hanya dipakai slide Tiket terlama. Ambang di
   AGE_CRITICAL_DAYS/AGE_WARNING_DAYS, bukan SLA.
   ============================================================ */
function AgeBadge({ ageDays }: { ageDays: number | null }) {
  if (ageDays === null) return <>—</>;
  const label = ageDays <= 0 ? 'Hari ini' : `${ageDays} hari`;
  if (ageDays >= AGE_CRITICAL_DAYS) {
    return (
      <span className="inline-block rounded-full px-4 py-1 text-[24px] font-semibold" style={{ backgroundColor: BRAND.danger, color: BRAND.ink }}>
        {label}
      </span>
    );
  }
  if (ageDays >= AGE_WARNING_DAYS) {
    return (
      <span className="inline-block rounded-full px-4 py-1 text-[24px] font-semibold" style={{ backgroundColor: BRAND.glow, color: BRAND.ink }}>
        {label}
      </span>
    );
  }
  return <>{label}</>;
}

/* ============================================================
   SLIDE 3b: TIKET TERLAMA BELUM SELESAI
   ============================================================ */
const SlideTerlama = memo(function SlideTerlama({ data, now }: { data: TvData; now: Date | null }) {
  if (data.oldest.length === 0) return <EmptyState text="Tidak ada tiket yang menunggu penyelesaian." />;

  return (
    <table className="w-full table-fixed border-collapse text-left">
      <colgroup>
        <col style={{ width: 160 }} />
        <col style={{ width: 270 }} />
        <col />
        <col style={{ width: 360 }} />
        <col style={{ width: 250 }} />
        <col style={{ width: 200 }} />
      </colgroup>
      <thead>
        <tr className="text-[22px] text-white/60">
          <th className="pb-4 font-medium">Umur</th>
          <th className="pb-4 font-medium">No. tiket</th>
          <th className="pb-4 font-medium">Perihal</th>
          <th className="pb-4 font-medium">Cabang / unit</th>
          <th className="pb-4 font-medium">PIC</th>
          <th className="pb-4 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {data.oldest.map((t) => {
          const created = new Date(t.createdAt);
          const ageDays = now ? wibDayDiff(created, now) : null;
          const isCritical = ageDays !== null && ageDays >= AGE_CRITICAL_DAYS;
          return (
            <tr key={t.id} className="border-t border-white/12" style={{ height: TICKET_ROW_H }}>
              <td
                className="pt-6 pr-4 pl-3 align-top text-[28px] font-semibold tabular-nums"
                style={{ borderLeft: `4px solid ${isCritical ? BRAND.danger : 'transparent'}` }}
              >
                <AgeBadge ageDays={ageDays} />
              </td>
              <td className="pr-4 pt-6 align-top text-[26px] font-semibold tabular-nums text-white/85">{t.ticketNumber}</td>
              <td className="pr-6 pt-6 align-top">
                <p className="line-clamp-2 text-[26px] font-semibold leading-snug">{t.title}</p>
              </td>
              <td className="truncate pr-4 pt-6 align-top text-[26px] text-white/85">{t.branch}</td>
              <td className="truncate pr-4 pt-6 align-top text-[26px] text-white/85">{t.picName ?? 'Belum ditentukan'}</td>
              <td className="pt-6 align-top"><StatusPill status={t.status} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});

/* ============================================================
   Avatar bulat berinisial -- dipakai slide Apresiasi
   ============================================================ */
function Avatar({ initial, size, highlight }: { initial: string; size: number; highlight?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        backgroundColor: highlight ? BRAND.glow : 'rgba(255,255,255,0.14)',
        color: highlight ? BRAND.ink : '#FFFFFF',
      }}
    >
      {initial}
    </div>
  );
}

/* ============================================================
   SLIDE 4: UCAPAN SELAMAT
   ============================================================ */
const CONFETTI_COLORS = [BRAND.glow, BRAND.sky, BRAND.tide, '#FFFFFF'];

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Confetti() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 70 }).map((_, i) => {
        const left = seeded(i, 1) * 100;
        const size = 10 + seeded(i, 2) * 14;
        const duration = 6 + seeded(i, 3) * 6;
        const delay = seeded(i, 4) * -12;
        const drift = (seeded(i, 5) - 0.5) * 160;
        return (
          <motion.span
            key={i}
            className="absolute top-0 block rounded-[2px]"
            style={{ left: `${left}%`, width: size, height: size * 0.45, backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
            initial={{ y: -40, x: 0, rotate: 0 }}
            animate={{ y: 1160, x: drift, rotate: 540 * (i % 2 ? 1 : -1) }}
            transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
          />
        );
      })}
    </div>
  );
}

const SlideSelamat = memo(function SlideSelamat({ data, now }: { data: TvData; now: Date | null }) {
  const list = data.milestones.slice(0, 4);
  const extra = data.milestones.length - list.length;
  const single = list.length === 1;

  return (
    <div className="relative h-full">
      {/* Confetti menutupi seluruh kanvas, bukan hanya area slide */}
      <div className="absolute" style={{ left: -72, right: -72, top: -204, bottom: -128 }}>
        <Confetti />
      </div>

      <div className="relative flex h-full flex-col items-center justify-center text-center">
        <p className="text-[150px] font-extrabold leading-none tracking-tight" style={{ color: BRAND.glow }}>Selamat!</p>

        {single ? (
          <div className="mt-10 flex flex-col items-center">
            <Avatar initial={list[0].initial} size={150} highlight />
            <p className="mt-6 text-[76px] font-bold leading-tight">{list[0].name}</p>
            <p className="mt-3 text-[42px] text-white/90">
              telah menyelesaikan total <span className="font-bold" style={{ color: BRAND.glow }}>{list[0].target} tiket</span>
              {now ? ` ${relativeDay(list[0].reachedAt, now)}` : ''}
            </p>
          </div>
        ) : (
          <div className="mt-14 flex justify-center gap-10">
            {list.map((m) => (
              <div key={`${m.initial}-${m.target}`} className="flex w-[380px] flex-col items-center rounded-3xl bg-white/12 px-6 py-8">
                <Avatar initial={m.initial} size={110} highlight />
                <p className="mt-5 flex min-h-[92px] items-center line-clamp-2 text-[36px] font-bold leading-tight">{m.name}</p>
                <p className="mt-3 text-[64px] font-extrabold leading-none tabular-nums" style={{ color: BRAND.glow }}>{m.target}</p>
                <p className="mt-1 text-[24px] text-white/80">tiket selesai{now ? `, ${relativeDay(m.reachedAt, now, true)}` : ''}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-12 text-[30px] text-white/80">Terima kasih atas dedikasinya melayani cabang dan unit kerja.</p>
        {extra > 0 && <p className="mt-2 text-[24px] text-white/60">Dan {extra} pencapaian lainnya.</p>}
      </div>
    </div>
  );
});
