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
