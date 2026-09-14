// src/lib/sla.ts
// Satu-satunya sumber kebenaran untuk aturan SLA tiket. Ubah di sini saja kalau ketentuan
// berubah -- angka ini masih SEMENTARA, menunggu surat ketentuan resmi dari BCA Syariah.
//
// Basis SLA adalah kategori tiket (bukan prioritas), dihitung dalam hari kerja (lihat
// businessDays.ts -- melewati Sabtu, Minggu, dan tanggal di holidays.ts).
import { addBusinessDays } from '@/src/lib/businessDays';
import { BIDANG } from '@/src/lib/roles';

export const SLA_DAYS: Record<string, number> = {
  [BIDANG.P3]: 3,
  [BIDANG.PEMBAYARAN]: 5,
  [BIDANG.PENGADAAN]: 14,
};
export const SLA_DAYS_DEFAULT = 3;

export function slaDaysForCategory(category: string): number {
  return SLA_DAYS[category] ?? SLA_DAYS_DEFAULT;
}

export function computeSlaDeadline(baseDate: Date, category: string): Date {
  return addBusinessDays(baseDate, slaDaysForCategory(category));
}
