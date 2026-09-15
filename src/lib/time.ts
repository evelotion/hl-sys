// src/lib/time.ts
// Helper WIB (UTC+7), dipakai bersama oleh Mode TV (tvStats.ts) dan pie chart bidang
// (dashboardStats.ts). Server Vercel jalan di UTC, jadi semua batas hari/bulan/tahun
// harus dihitung eksplisit dengan offset ini.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export const wibDayKey = (d: Date): string => new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);

export function startOfWibDay(d: Date): Date {
  const s = new Date(d.getTime() + WIB_OFFSET_MS);
  s.setUTCHours(0, 0, 0, 0);
  return new Date(s.getTime() - WIB_OFFSET_MS);
}

export function startOfWibMonth(d: Date): Date {
  const s = new Date(d.getTime() + WIB_OFFSET_MS);
  s.setUTCDate(1);
  s.setUTCHours(0, 0, 0, 0);
  return new Date(s.getTime() - WIB_OFFSET_MS);
}

export function startOfWibYear(d: Date): Date {
  const s = new Date(d.getTime() + WIB_OFFSET_MS);
  s.setUTCMonth(0, 1);
  s.setUTCHours(0, 0, 0, 0);
  return new Date(s.getTime() - WIB_OFFSET_MS);
}

// Selisih hari kalender WIB antara dua tanggal (berbasis wibDayKey, bukan selisih
// milidetik dibagi 86400000), supaya tidak meleset karena jam. Dipakai untuk umur
// tiket di slide "Tiket terlama" Mode TV.
export function wibDayDiff(from: Date, to: Date): number {
  const a = new Date(`${wibDayKey(from)}T00:00:00Z`).getTime();
  const b = new Date(`${wibDayKey(to)}T00:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

// --- Formatter tampilan WIB (Blueprint v3 Fase 2) ------------------------------
// Semua pakai timeZone eksplisit 'Asia/Jakarta', supaya hasilnya sama persis di
// server (Vercel, UTC) maupun di browser mana pun -- tidak bergantung pada jam
// lokal proses/perangkat yang menjalankannya. Dipakai di seluruh halaman dashboard,
// bukan cuma Mode TV (yang sudah punya formatter sendiri, tidak diubah di sini).
const WIB_TZ = 'Asia/Jakarta';
const LOCALE_ID = 'id-ID';

const shortDateFmt = new Intl.DateTimeFormat(LOCALE_ID, { day: 'numeric', month: 'short', year: 'numeric', timeZone: WIB_TZ });
const longDateFmt = new Intl.DateTimeFormat(LOCALE_ID, { day: 'numeric', month: 'long', year: 'numeric', timeZone: WIB_TZ });
const fullDateFmt = new Intl.DateTimeFormat(LOCALE_ID, { dateStyle: 'full', timeZone: WIB_TZ });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE_ID, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: WIB_TZ });
const timeFmt = new Intl.DateTimeFormat(LOCALE_ID, { hour: '2-digit', minute: '2-digit', timeZone: WIB_TZ });

/** Tanggal pendek: "14 Sep 2026". */
export function formatShortDateWib(d: Date | string): string {
  return shortDateFmt.format(new Date(d));
}

/** Tanggal panjang: "14 September 2026". */
export function formatLongDateWib(d: Date | string): string {
  return longDateFmt.format(new Date(d));
}

/** Tanggal lengkap dengan nama hari: "Senin, 14 September 2026". Dipakai untuk
 * dokumen/laporan yang dicetak, bukan salah satu dari 4 bentuk kanonik biasa. */
export function formatFullDateWib(d: Date | string): string {
  return fullDateFmt.format(new Date(d));
}

/** Tanggal + jam, dengan label "WIB" -- supaya label dan nilainya tidak pernah bisa
 * berbeda lagi: "14 Sep 2026, 14.30 WIB". */
export function formatDateTimeWib(d: Date | string): string {
  return `${dateTimeFmt.format(new Date(d))} WIB`;
}

/** Jam saja, dengan label "WIB": "14.30 WIB". */
export function formatTimeWib(d: Date | string): string {
  return `${timeFmt.format(new Date(d))} WIB`;
}
