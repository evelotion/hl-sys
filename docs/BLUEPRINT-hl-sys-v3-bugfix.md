# Blueprint hl-sys v3: Perbaikan Bug Sebelum Deploy Pertama

Dokumen ini adalah instruksi kerja untuk Claude Code, kelanjutan dari `BLUEPRINT-hl-sys-v2.md` (semua 6 fasenya sudah selesai). Isinya adalah pekerjaan yang di v2 sengaja ditunda di bagian 9.

Baca seluruhnya sebelum menulis kode, lalu kerjakan **per fase, berurutan**. Berhenti di akhir setiap fase dan laporkan ke Indra sebelum lanjut.

---

## 0. Konteks dan aturan main

### 0.1 Yang sudah berlaku sekarang
Semua ini hasil v2 dan **tidak boleh dirusak** oleh pekerjaan di dokumen ini:
- Session ditandatangani HMAC (`src/lib/session.ts`), otorisasi lewat `can()` di `src/lib/roles.ts`, user dimuat dari DB lewat `getCurrentUser()` (`src/lib/auth.ts`).
- Semua API dan page dijaga `requirePermission`. `userId` untuk activity log **selalu** dari session, tidak pernah dari body.
- `toTicketDTO` (`src/lib/ticketDto.ts`) membuang SLA, prioritas, dan kontak untuk role yang tidak berhak.
- Bidang diambil dari kolom `User.team`, bukan daftar inisial hardcoded.
- Helper WIB ada di `src/lib/time.ts`.

Sebelum mulai, baca `docs/PROGRESS.md`, `docs/BLUEPRINT-hl-sys-v2.md`, dan `docs/RELEASE-NOTES.md`.

### 0.2 Aturan keras (sama seperti v2)
1. **SLA tidak boleh terlihat di luar Departemen Logistik.** Data SLA dibuang di server lewat `toTicketDTO`, bukan disembunyikan di UI. Setiap kali dokumen ini menyuruh menambahkan field SLA baru ke suatu response, pastikan field itu juga ikut aturan `canSeeSla`.
2. **Otorisasi selalu di server**, lewat `can()`. Jangan pernah menambahkan pengecekan role baru dengan membandingkan string secara langsung.
3. **Waktu selalu WIB.** Server Vercel berjalan di UTC.
4. **Jangan menambah dependency baru.**
5. Query yang hasilnya dikirim ke client wajib memakai `select` eksplisit.

### 0.3 Aturan database
- **Jangan pernah menjalankan `prisma/seed.ts`**, `migrate reset`, atau `db push`.
- Fase 1 dan 2 di dokumen ini **tidak butuh perubahan schema**. Fase 3 butuh satu kolom baru dan sudah diberi prosedur khusus di bagiannya.
- Drift kolom `password` sudah diselesaikan di DB dev lewat migration baseline `20260913082730_baseline_user_password_drift`. **Baseline ini belum di-resolve di produksi** — lihat `docs/RELEASE-NOTES.md`.
- Untuk menerapkan migration ke DB dev, pakai `prisma migrate deploy`, bukan `migrate dev`.

### 0.4 Protokol kerja
- Satu fase = satu commit dengan pesan jelas. Jangan pakai pesan "update".
- Di akhir setiap fase: `npx tsc --noEmit` dan `npx eslint .` (script `next lint` sudah tidak ada di Next 16). Error baru dari file yang kamu sentuh wajib diperbaiki.
- Laporan setiap fase berisi: file yang berubah, keputusan yang diambil, dan hasil uji manual yang **benar-benar dijalankan** (bukan diklaim).
- Jangan commit sebelum Indra review.
- Jangan pernah menjalankan script yang menulis ke DB tanpa izin eksplisit. Script apa pun yang mengubah data harus dry-run secara default.

---

## Fase 1: SLA satu rumus

### 1.1 Masalahnya
Ada dua rumus SLA yang saling bertabrakan:

| | Sumber | Basis | Hari |
|---|---|---|---|
| Saat create (`api/tickets/route.ts`) | `priority` | URGENT 1, MEDIUM 3, LOW 7 | hari kerja (`addBusinessDays`) |
| Saat edit (`api/tickets/[id]/route.ts`) | `category` | P3 3, Pembayaran 5, Pengadaan 14, lainnya 1 | hari kalender (`addDays`) |

Akibatnya, setiap tiket yang diedit — bahkan hanya untuk memperbaiki salah ketik di judul — SLA-nya dihitung ulang dengan rumus yang sama sekali berbeda. Selain itu `priority` tidak ikut di-destructure saat edit, sehingga perubahan prioritas dari form edit tidak pernah tersimpan.

### 1.2 Keputusan Indra
- **Basis SLA adalah kategori**, bukan prioritas: P3 = 3, Pembayaran = 5, Pengadaan = 14, kategori lain = 3.
- **Dihitung dalam hari kerja**, melewati Sabtu, Minggu, libur nasional, dan cuti bersama.
- Angka ini **sementara**, menunggu surat ketentuan resmi. Karena itu semuanya harus terkumpul di satu tempat supaya gampang diubah.

### 1.3 Yang harus dikerjakan

**Buat `src/lib/sla.ts`** sebagai satu-satunya sumber kebenaran SLA:

```ts
// Semua angka SLA ada di sini. Ubah di sini saja kalau ketentuan berubah.
export const SLA_DAYS: Record<string, number> = {
  P3: 3,
  Pembayaran: 5,
  Pengadaan: 14,
};
export const SLA_DAYS_DEFAULT = 3;

export function slaDaysForCategory(category: string): number { ... }
export function computeSlaDeadline(baseDate: Date, category: string): Date { ... }
```

`computeSlaDeadline` memakai `addBusinessDays` dari `businessDays.ts` (setelah diperbaiki di 1.4), dan **tidak boleh** memakai `addDays` kalender.

**Ubah `api/tickets/route.ts` (create)** supaya memanggil `computeSlaDeadline`, bukan menghitung dari `priority`.

**Ubah `api/tickets/[id]/route.ts` (edit penuh)**:
- Panggil `computeSlaDeadline`, hapus blok if-else kategori dan import `addDays`.
- Tambahkan `priority` ke destructuring body dan ke `data:` update, supaya perubahan prioritas tersimpan. Validasi nilainya terhadap daftar yang diizinkan (`URGENT`, `MEDIUM`, `LOW`); nilai lain ditolak.
- **Perbaiki reset `requestDate`.** Sekarang `const baseDate = requestDate ? new Date(requestDate) : new Date()` membuat tanggal permintaan ke-reset ke hari ini setiap kali form dikirim tanpa field itu. Kalau `requestDate` tidak dikirim, pertahankan nilai lama dari `oldTicket`.
- **Hitung ulang SLA hanya kalau perlu.** Deadline hanya dihitung ulang jika `category` atau `requestDate` benar-benar berubah. Kalau keduanya sama, `slaDeadline` tidak boleh disentuh. Ini mencegah SLA bergeser hanya karena judul diperbaiki.
- Kalau deadline berubah, catat ke activity log: kategori/tanggal lama → baru, beserta deadline lama → baru.

**Prioritas tetap ada** sebagai penanda urgensi untuk tampilan dan pengurutan, hanya tidak lagi menentukan SLA. Jangan menghapus kolomnya.

### 1.4 Libur nasional dan cuti bersama
`addBusinessDays` sekarang hanya melewati Sabtu dan Minggu.

- Buat `src/lib/holidays.ts` berisi daftar tanggal libur dalam format `YYYY-MM-DD` (string, zona WIB), dengan komentar jelas bahwa Indra mengisinya sekali setahun. **Isi dengan array kosong** — jangan menebak tanggal libur, karena kamu tidak bisa memverifikasinya.
- Ubah `addBusinessDays` supaya juga melewati tanggal yang ada di daftar itu, dan tambahkan parameter opsional supaya fungsinya tetap bisa diuji.
- Perbandingan tanggal memakai `wibDayKey` dari `time.ts`, bukan `getDay()` lokal server.

### 1.5 Perhatian WIB
`addBusinessDays` sekarang memakai `result.getDay()`, yang di Vercel berjalan dalam UTC. Akibatnya penentuan akhir pekan bisa meleset untuk tiket yang dibuat antara 00.00–07.00 WIB. Perbaiki dengan menghitung hari berdasarkan WIB.

### 1.6 Kriteria selesai
- [ ] Mencari `addDays(` di `src/` tidak menemukan hasil untuk perhitungan SLA.
- [ ] Edit judul tiket saja → `slaDeadline` tidak berubah sedikit pun.
- [ ] Edit kategori dari Pengadaan ke P3 → deadline dihitung ulang, dan ada log perubahannya.
- [ ] Edit tanpa mengirim `requestDate` → tanggal permintaan tidak ter-reset ke hari ini.
- [ ] Ubah prioritas lewat form edit → tersimpan di DB.
- [ ] Isi satu tanggal libur di `holidays.ts`, buat tiket yang melewatinya → deadline mundur satu hari kerja.

---

## Fase 2: Waktu WIB di seluruh aplikasi

### 2.1 Masalahnya
Server Vercel berjalan di UTC. Lima file memanggil `toLocaleDateString`, `toLocaleTimeString`, atau `toLocaleString` tanpa `timeZone`, dan sebagian hasilnya diberi label "WIB". Jam yang tampil mundur 7 jam, dan perhitungan "hari ini" meleset antara pukul 00.00–07.00 WIB.

File yang terdampak:
- `src/app/(dashboard)/page.tsx`
- `src/app/(dashboard)/DashboardClient.tsx`
- `src/app/(dashboard)/tickets/page.tsx`
- `src/app/(dashboard)/tickets/[id]/TaskViewClient.tsx`
- `src/app/(dashboard)/reports/ReportsClient.tsx`

Mode TV (`src/app/tv/`) sudah benar dan bisa dijadikan acuan.

### 2.2 Yang harus dikerjakan
- Tambahkan formatter siap pakai ke `src/lib/time.ts`, semuanya dengan `timeZone: 'Asia/Jakarta'` dan locale `id-ID`: tanggal pendek, tanggal panjang, tanggal+jam, dan jam saja.
- Ganti semua pemanggilan `toLocale*` di lima file itu dengan formatter tersebut. Jangan sisakan satu pun tanpa zona waktu.
- **Audit semua perbandingan tanggal**, bukan hanya penampilan. Cari perhitungan "hari ini", "bulan ini", awal/akhir periode, dan `getDay()`, lalu ganti dengan helper WIB yang sudah ada (`startOfWibDay`, `startOfWibMonth`, `startOfWibYear`, `wibDayKey`). Ini yang menyebabkan angka dashboard meleset di dini hari, dan dampaknya lebih besar daripada jam yang salah tampil.
- **Perhatian hydration.** Beberapa file ini adalah komponen client. Kalau ada nilai yang bergantung pada "sekarang" dan dirender di server maupun client, pakai pola yang dipakai Mode TV: mulai dari `null`, isi setelah mount. Jangan sampai muncul hydration mismatch.
- Cari juga string `"WIB"` yang ditempel manual, dan pastikan nilainya memang sudah WIB.
- Ekspor satu sumber offset WIB dari `time.ts`, dan hapus duplikat perhitungan offset di `TvDisplayClient.tsx` supaya tidak ada dua definisi yang bisa berbeda.

### 2.3 Kriteria selesai
- [ ] `grep -rn "toLocale" src/` — setiap hasil punya `timeZone: 'Asia/Jakarta'`, atau memakai formatter dari `time.ts`.
- [ ] Jam yang tampil di dashboard dan detail tiket sama dengan jam dinding WIB.
- [ ] Uji dini hari: jalankan dengan `TZ=UTC` dan waktu sistem disetel ke 22.30 UTC (05.30 WIB keesokan harinya), lalu pastikan angka "hari ini" di dashboard sesuai tanggal WIB, bukan UTC.
- [ ] Tidak ada peringatan hydration mismatch di console browser.

---

## Fase 3: Nomor tiket anti-tabrakan

### 3.1 Masalahnya
Nomor tiket dibuat dengan membaca nomor terakhir lalu menambah satu. Kalau dua tiket dibuat hampir bersamaan, keduanya membaca nomor yang sama, lalu salah satunya gagal karena unique constraint. Pemakainya melihat error tanpa tahu sebabnya dan kehilangan isi form.

### 3.2 Pendekatan
Pakai **tabel counter per tahun** yang di-increment di dalam transaksi, bukan sekadar mengulang percobaan.

- Tambahkan model baru, misalnya `TicketCounter { year Int @id, lastNumber Int }`.
- Nomor diambil dalam `db.$transaction`: naikkan `lastNumber` untuk tahun berjalan (tahun dalam WIB), lalu bentuk `LOG-<tahun>-<4 digit>`.
- **Seed nilai awal** dari nomor tertinggi yang sudah ada, supaya tidak menabrak tiket lama. Ini dilakukan lewat script terpisah yang **dry-run secara default**, bukan otomatis saat aplikasi berjalan.
- Tambahkan tetap satu lapis pengaman: kalau unique constraint tetap kena, ulangi maksimal 3 kali, lalu balas dengan pesan yang bisa dipahami.

### 3.3 Prosedur schema (wajib diikuti)
1. Tambahkan model ke `schema.prisma`.
2. Buat migration dengan `--create-only`, **tunjukkan SQL-nya ke Indra, dan berhenti**.
3. Setelah disetujui, terapkan ke DB dev dengan `prisma migrate deploy`.
4. Jalankan script seed counter dalam mode dry-run, tunjukkan hasilnya, dan **jangan `--apply` sendiri**.
5. Catat di `docs/RELEASE-NOTES.md` bahwa script seed counter ini juga wajib dijalankan di produksi setelah migration, sebelum tiket baru dibuat.

### 3.4 Kriteria selesai
- [ ] Kirim 10 request pembuatan tiket secara bersamaan → 10 nomor unik berurutan, nol error.
- [ ] Nomor pertama setelah seed melanjutkan nomor tiket tertinggi yang ada, bukan mengulang dari awal.
- [ ] Pergantian tahun menghasilkan urutan baru mulai dari 0001.

---

## Fase 4: Bersih-bersih

Kerjakan keempatnya dalam satu fase.

### 4.1 Log re-assign palsu
`oldTicket?.picId !== picId` bernilai true saat membandingkan `null` dengan `""`, sehingga muncul log "Re-assign PIC dari Belum di-assign menjadi Belum di-assign". Normalkan keduanya ke `null` sebelum dibandingkan, dan jangan buat log kalau tidak ada perubahan nyata. Periksa juga tempat lain yang memakai pola perbandingan serupa, termasuk `isReassigned`.

### 4.2 Kode mati
- `src/lib/actions.ts` — `selesaikanTiket` tidak dipanggil dari mana pun, hanya diberi guard di v2. **Konfirmasi sekali lagi dengan grep**, lalu hapus filenya.
- `src/app/(dashboard)/tickets/[id]/resolve/route.ts` — sudah diberi guard, tapi tidak dipanggil UI mana pun. **Jangan langsung dihapus**: pertama periksa apakah endpoint ini satu-satunya jalur yang mengisi `proofImgUrl` (bukti kerja). Kalau iya, laporkan ke Indra bahwa fitur unggah bukti kerja memang tidak pernah tersambung ke UI, dan tanyakan apakah mau disambungkan atau dihapus. Jangan putuskan sendiri.
- `src/app/api/upload/route.ts` — periksa apakah masih dipakai setelah pemeriksaan di atas. Kalau tidak, usulkan penghapusan, jangan langsung hapus.

### 4.3 Pesan error yang menyembunyikan sebab
Pola "Inisial mungkin sudah dipakai atau terjadi kesalahan" pernah membuat bug form `/users` sulit dilacak. Cari pesan error generik serupa di API lain, dan ganti dengan pesan yang sesuai penyebab sebenarnya, tanpa membocorkan detail internal. Kasus yang perlu dibedakan minimal: unique constraint, validasi gagal, data tidak ditemukan, dan kesalahan tak terduga. Untuk yang terakhir, tetap `console.error` lengkap di server.

### 4.4 Hapus user yang punya activity log
FK `ActivityLog.userId` memakai `onDelete: Restrict`, jadi menghapus user yang pernah berkomentar selalu gagal dengan pesan "Gagal delete user" tanpa penjelasan. Jangan ubah schema. Cukup deteksi kasus ini dan balas dengan pesan yang menjelaskan bahwa user tidak bisa dihapus karena punya riwayat aktivitas, beserta saran menonaktifkan atau mengganti rolenya.

### 4.5 Kriteria selesai
- [ ] Edit tiket tanpa mengubah PIC → tidak ada log re-assign.
- [ ] Simpan user dengan inisial yang sudah dipakai → pesan menyebut inisial duplikat, bukan pesan generik.
- [ ] Hapus user yang punya komentar → pesan menjelaskan sebabnya.
- [ ] `tsc` dan `eslint` bersih setelah penghapusan kode mati.

---

## Fase 5: Pembersihan data pribadi di git history

**Fase ini dikerjakan Indra sendiri, bukan Claude Code.** Claude Code hanya menyiapkan bahan dan instruksi, tidak menjalankan apa pun.

### 5.1 Masalahnya
`prisma/seed.ts` berisi nama, email kantor, dan nomor HP pribadi sekitar 20 karyawan. Repo pernah berstatus publik, jadi data itu ada di riwayat git dan harus dianggap sudah terekspos. Menghapus filenya saja tidak cukup — datanya tetap ada di commit lama.

File itu juga menjalankan `deleteMany()` terhadap seluruh tiket dan user, sehingga berbahaya kalau sampai terjalankan.

### 5.2 Yang harus disiapkan Claude Code
- Tulis `docs/CLEANUP-HISTORY.md` berisi langkah lengkap untuk Indra: memakai `git filter-repo` untuk membuang `prisma/seed.ts` dari seluruh riwayat, membuat cadangan repo sebelum mulai, konsekuensi bahwa semua hash commit berubah, dan perlunya force-push.
- Sertakan peringatan: setelah force-push, salinan repo di tempat lain harus di-clone ulang, bukan di-pull.
- Sertakan juga langkah mengganti `seed.ts` dengan versi aman yang membaca dari file lokal ber-gitignore dan tidak memakai `deleteMany`, atau menghapusnya sama sekali.
- **Jangan jalankan `git filter-repo`, jangan force-push, jangan hapus `seed.ts`.** Hanya tulis dokumennya.

---

## Fase 6: Persiapan deploy

Setelah Fase 1–4 selesai dan direview, lakukan pemeriksaan akhir. **Jangan deploy.** Deploy dijalankan Indra mengikuti `docs/DEPLOY-GUIDE.md` (dokumen terpisah).

- Verifikasi `docs/RELEASE-NOTES.md` memuat seluruh langkah produksi yang tertunda: `migrate resolve` baseline drift, `migrate deploy`, backfill bidang `--apply`, seed counter tiket, `SESSION_SECRET` di Vercel, dan peringatan mass-logout.
- Jalankan `npm run build` dari kondisi bersih (`rm -rf .next`) dan laporkan hasilnya.
- Laporkan daftar environment variable yang dibutuhkan aplikasi di produksi.
- Konfirmasi `prisma migrate status` terhadap DB dev bersih.
- Buat ringkasan perubahan yang terlihat oleh pengguna akhir, untuk bahan pengumuman ke tim.

---

## Lampiran: hal yang sengaja tidak dikerjakan

Catat, jangan kerjakan tanpa instruksi baru:
- **Rate limit login** masih in-memory, tidak efektif di Vercel karena tiap instance punya memori sendiri.
- **Activity log untuk aktivitas non-tiket** (reset password) masih hanya `console.log`, karena `ActivityLog.ticketId` tidak nullable. Solusinya tabel terpisah, bukan membuat kolom itu nullable.
- **Angka SLA** masih sementara, menunggu surat ketentuan resmi.
- **Libur nasional** diisi manual sekali setahun oleh Indra.
