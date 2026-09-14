// src/lib/businessDays.ts
import { wibDayKey } from '@/src/lib/time';
import { HOLIDAYS_WIB } from '@/src/lib/holidays';

const DAY_MS = 24 * 60 * 60 * 1000;

// Hari-dalam-minggu dihitung dari tanggal kalender WIB (wibDayKey), bukan getDay() lokal
// server -- server Vercel berjalan di UTC, jadi getDay() bisa meleset untuk tiket yang
// dibuat antara pukul 00.00-07.00 WIB (saat itu tanggal UTC masih "kemarin").
function isWibWeekend(d: Date): boolean {
  const dow = new Date(`${wibDayKey(d)}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6; // Minggu (0) atau Sabtu (6)
}

// 1. Tambah hari kerja: melewati Sabtu, Minggu, dan tanggal di `holidays` (default:
// HOLIDAYS_WIB). Parameter `holidays` opsional supaya fungsi ini tetap bisa diuji dengan
// daftar libur custom tanpa menyentuh data asli.
export function addBusinessDays(startDate: Date, days: number, holidays: string[] = HOLIDAYS_WIB): Date {
  const holidaySet = new Set(holidays);
  const result = new Date(startDate);
  let count = 0;
  while (count < days) {
    result.setTime(result.getTime() + DAY_MS);
    if (!isWibWeekend(result) && !holidaySet.has(wibDayKey(result))) {
      count++;
    }
  }
  return result;
}

// 2. Fungsi untuk menghitung selisih menit murni hanya di hari kerja (Senin-Jumat)
export function getBusinessMinutesBetween(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);

  if (s > e) return 0;

  let totalMinutes = 0;
  const current = new Date(s);

  // Lakukan perulangan per 30 menit demi performa yang efisien
  while (current < e) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Jika hari kerja, hitung waktunya
      totalMinutes += 30;
    }
    current.setMinutes(current.getMinutes() + 30);
  }

  return totalMinutes;
}
