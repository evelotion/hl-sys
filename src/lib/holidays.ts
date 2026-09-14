// src/lib/holidays.ts
// Daftar tanggal libur nasional dan cuti bersama, dipakai addBusinessDays (businessDays.ts)
// untuk menghitung deadline SLA. Format tanggal: 'YYYY-MM-DD', mengacu ke kalender WIB.
//
// Indra yang mengisi/memperbarui daftar ini sekali setahun. SENGAJA dikosongkan di sini --
// jangan menebak tanggal libur, karena tidak bisa diverifikasi dari kode.
export const HOLIDAYS_WIB: string[] = [];
