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
