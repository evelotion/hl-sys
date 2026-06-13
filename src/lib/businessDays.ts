    // src/lib/businessDays.ts

// 1. Fungsi untuk menambah hari kerja (melewati Sabtu & Minggu)
export function addBusinessDays(startDate: Date, days: number): Date {
    const result = new Date(startDate);
    let count = 0;
    while (count < days) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) { // Bukan Minggu (0) dan bukan Sabtu (6)
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