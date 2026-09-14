# Catatan Rilis

## ⚠️ WAJIB dilakukan manual sebelum deploy pertama yang membawa migration ke produksi

**Migration:** `20260913082730_baseline_user_password_drift`

**Konteks:** Kolom `User.password` sudah ada di database sejak lama (kemungkinan ditambahkan lewat
`prisma db push` di masa lalu), tapi tidak pernah tercatat di riwayat migration manapun — ini
drift yang sudah diketahui sejak awal (lihat `docs/BLUEPRINT-hl-sys-v2.md` bagian 0.3). Migration
`20260913082730_baseline_user_password_drift` dibuat untuk mendaftarkan kolom itu secara resmi ke
riwayat Prisma Migrate, isinya:

```sql
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'password123';
```

Migration ini **sudah ditandai sebagai diterapkan di database development** dengan:

```
prisma migrate resolve --applied 20260913082730_baseline_user_password_drift
```

Perintah `migrate resolve` **hanya menandai riwayat migration di database yang sedang
ditunjuk oleh `DATABASE_URL` saat perintah itu dijalankan** — dalam hal ini database dev. Ia
**tidak** menjalankan SQL apa pun dan **tidak** menyentuh database lain (termasuk produksi).

**Akibatnya:** dari sudut pandang Prisma, database **produksi** masih menganggap migration ini
belum pernah berjalan. Kalau suatu saat nanti `prisma migrate deploy` dijalankan ke produksi
(baik manual maupun lewat CI/CD Vercel) dan migration ini termasuk yang mau di-deploy, perintah
itu akan mencoba menjalankan `ALTER TABLE "User" ADD COLUMN "password" ...` — dan **gagal**,
karena kolom `password` tersebut sudah ada di produksi juga (sama seperti di dev, drift yang sama
berlaku di kedua tempat).

**Yang harus dilakukan, sekali saja, SEBELUM deploy pertama yang membawa migration ini ke
produksi:**

```bash
# Jalankan dengan DATABASE_URL yang menunjuk ke database PRODUKSI
prisma migrate resolve --applied 20260913082730_baseline_user_password_drift
```

Setelah itu baru aman menjalankan `prisma migrate deploy` seperti biasa ke produksi.

**Jangan** menjalankan `prisma migrate dev` ke produksi untuk kasus ini — itu akan mendeteksi
drift dan berpotensi menawarkan reset database.

## ⚠️ Endpoint database yang dipakai untuk migrate resolve/deploy di atas

Kedua migration di atas (`20260913082730_baseline_user_password_drift` dan
`20260913083406_add_sessions_valid_from`) diterapkan lewat `DATABASE_URL` di `.env` lokal, yang
menunjuk ke endpoint Neon:

```
ep-nameless-boat-aom2d7nw-pooler.c-2.ap-southeast-1.aws.neon.tech
```

Ini adalah endpoint **development/testing** — dikonfirmasi langsung oleh Indra sebelum sesi
pengujian live dijalankan (bukan produksi BCA Syariah).

**Perhatikan akhiran `-pooler` di hostname-nya.** Itu adalah endpoint PgBouncer (connection
pooling) milik Neon, dipakai untuk koneksi runtime aplikasi (banyak koneksi pendek/serverless).
Untuk `prisma migrate resolve` dan `prisma migrate deploy` ke **produksi**, gunakan **direct
connection** (endpoint TANPA akhiran `-pooler`, biasanya tersedia sebagai connection string kedua
di dashboard Neon, kadang disebut "direct connection" atau dipakai lewat env `DIRECT_URL`).
Migration/DDL lewat PgBouncer transaction-pooling bisa gagal atau berperilaku tidak terduga
(prepared statement, advisory lock yang dipakai Prisma Migrate untuk mengunci proses migrasi).
Kebetulan berhasil di dev lewat endpoint pooler ini, tapi jangan diasumsikan akan selalu aman —
pakai direct connection untuk migrate resolve/deploy ke produksi.

---

## ⚠️ Migration `add_sessions_valid_from` akan me-logout SEMUA pengguna satu kali

Migration `20260913083406_add_sessions_valid_from` menambah kolom `User.sessionsValidFrom` dengan
`DEFAULT CURRENT_TIMESTAMP`. Begitu migration ini dijalankan di produksi, **setiap baris `User`
yang sudah ada akan langsung terisi dengan waktu migration dijalankan** sebagai
`sessionsValidFrom`-nya.

Karena `getCurrentUser` menolak token session dengan `iat` lebih lama dari `sessionsValidFrom`, dan
semua session yang diterbitkan SEBELUM migration ini otomatis punya `iat` lebih lama — **semua
orang yang sedang login saat migration dijalankan akan langsung ter-logout paksa**, walau mereka
tidak pernah mengubah password. Ini perilaku yang diharapkan (bukan bug), tapi harus
**diberitahukan ke tim sebelum rilis** supaya tidak dikira sistem error — sebaiknya dijadwalkan di
luar jam sibuk dan diumumkan dulu ("akan diminta login ulang sekali setelah update ini").

---

## ⚠️ Backfill `User.team` (Fase 3) baru dijalankan di DB dev, belum di produksi

`scripts/backfill-bidang.ts` (dry-run via `npx tsx scripts/backfill-bidang.ts`, tulis dengan
`npm run backfill:bidang -- --apply`) sejauh ini baru pernah dijalankan dalam mode **dry-run**
terhadap DB **dev** — belum pernah `--apply`, baik ke dev maupun produksi.

**Sebelum atau segera setelah Fase 3 di-deploy ke produksi**, `backfill:bidang -- --apply` **wajib**
dijalankan juga terhadap DB produksi (dengan `DATABASE_URL` mengarah ke produksi). Kalau tidak:
semua user produksi tetap bertim `Lainnya` seperti sebelumnya, dan dropdown PIC di halaman buat
tiket serta edit tiket akan **kosong** untuk kategori P3, Pengadaan, dan Pembayaran (karena
sekarang PIC difilter berdasarkan `User.team`, bukan lagi daftar inisial hardcoded).

Script ini aman dijalankan berkali-kali: hanya menyentuh user yang `team`-nya masih `Lainnya`,
tidak pernah menimpa nilai yang sudah diisi manual.

**Catatan:** inisial `RLY` (PIC_LOGISTIK) tidak ada di pemetaan hardcoded manapun, sehingga tidak
akan ikut ter-backfill otomatis, baik di dev maupun produksi. Indra sudah memutuskan: **tidak perlu
diisi manual sekarang** — bidangnya akan diurus di Fase 6, bukan bagian dari backfill Fase 3 ini.

---

## ⚠️ SLA bercampur basis setelah Blueprint v3 Fase 1 (rumus SLA disatukan)

Sebelum Fase 1 (`docs/BLUEPRINT-hl-sys-v3-bugfix.md`), ada dua rumus SLA yang saling
bertabrakan: saat **create**, deadline dihitung dari `priority` (URGENT 1 hari kerja, MEDIUM 3,
LOW 7); saat **edit**, deadline dihitung ulang dari `category` dengan hari **kalender** (bukan
hari kerja). Fase 1 menyatukan keduanya menjadi satu rumus di `src/lib/sla.ts`: basis
**kategori**, dihitung dalam **hari kerja** (P3 = 3, Pembayaran = 5, Pengadaan = 14, kategori
lain = 3).

**Sengaja tidak ada migrasi data untuk tiket lama.** `slaDeadline` yang sudah tersimpan di
tiket-tiket sebelum Fase 1 dibiarkan apa adanya (hasil rumus lama berbasis prioritas) — **tidak
dihitung ulang secara massal**, dan tidak ada script untuk itu. Akibatnya, untuk sementara:

- Tiket yang dibuat/terakhir diedit **sebelum** Fase 1: `slaDeadline` masih basis prioritas
  (hari kerja) atau basis kategori-kalender (tergantung kapan terakhir disentuh) — dua rumus lama
  yang berbeda, sudah dijelaskan di atas.
- Tiket yang dibuat **setelah** Fase 1: `slaDeadline` basis kategori, hari kerja (rumus baru).
- Tiket lama ikut pindah ke rumus baru **hanya kalau** kategorinya atau tanggal permintaannya
  diedit setelah Fase 1 — SLA-nya baru dihitung ulang saat itu, memakai rumus baru.

Jadi untuk sementara waktu setelah deploy, dashboard/laporan SLA akan menampilkan campuran dua
basis perhitungan pada tiket-tiket lama, sampai masing-masing tersentuh edit kategori/tanggal.
Ini bukan bug — keputusan sadar dari Indra untuk menghindari perubahan data massal yang tidak
diminta. Kalau suatu saat perlu penyeragaman retroaktif, itu pekerjaan terpisah yang butuh
persetujuan eksplisit sebelum menjalankan script apa pun terhadap data produksi.

---

## TODO operasional (belum dikerjakan, dicatat supaya tidak terlupa)

**Rate limit login tidak efektif di Vercel.** `src/app/api/auth/login/route.ts` membatasi
percobaan login (maks 5x/15 menit per inisial) dengan `Map` di memori proses Node. Ini cukup untuk
menahan brute force kasar di satu proses (mis. `npm run dev`, atau satu instance server yang hidup
lama), tapi **tidak efektif di Vercel**: setiap serverless function instance (dan tiap region)
punya memori sendiri-sendiri, jadi batasnya berlaku per-instance, bukan per-inisial secara global —
penyerang yang requestnya kebagian instance berbeda-beda praktis tidak akan pernah kena limit.
Perlu diganti dengan penyimpanan bersama (mis. Redis/Upstash, atau tabel di Postgres) sebelum
diandalkan sebagai proteksi utama di produksi.

---

## Riwayat

- `20260913082730_baseline_user_password_drift` — baseline untuk drift kolom `User.password` di
  atas. Diterapkan ke DB dev pada 2026-09-13 lewat `migrate resolve --applied` (bukan `migrate
  dev`/`db push`), sesuai `docs/BLUEPRINT-hl-sys-v2.md` bagian 0.3.
- `20260913083406_add_sessions_valid_from` — menambah kolom `User.sessionsValidFrom` untuk
  hardening sesi: token dengan `iat` lebih lama dari nilai ini ditolak oleh `getCurrentUser`.
  Diterapkan ke DB dev pada 2026-09-13 lewat `prisma migrate deploy` (bukan `migrate dev`), tanpa
  drift/reset prompt karena riwayat migration sudah bersih setelah baseline di atas. Perlu
  `prisma migrate deploy` yang sama terhadap produksi sebelum rilis pertama yang membawa migration
  ini (tidak perlu langkah `resolve` manual seperti baseline di atas, karena kolom ini memang
  belum pernah ada di produksi).
