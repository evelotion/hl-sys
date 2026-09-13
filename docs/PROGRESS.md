# Progress Handover — hl-sys Blueprint v2

Dokumen ini merangkum posisi pekerjaan terhadap `docs/BLUEPRINT-hl-sys-v2.md`, supaya sesi
Claude Code baru bisa langsung lanjut tanpa membaca riwayat chat sebelumnya. Update dokumen ini
setiap kali sebuah fase selesai atau ada keputusan penting baru.

## Status per fase

| Fase | Status | Commit |
|---|---|---|
| Fase 1 — Fondasi auth & permission | ✅ Selesai | `615604e` feat(auth): signed session, permission matrix, and API authorization<br>`c50b699` fix(auth): harden session and permission checks<br>`f47a6cb` feat(auth): invalidate sessions on password change |
| Fase 2 — Mode TV | ✅ Selesai | `6c71bb3` feat(tv): full-screen TV mode with live rotating slides |
| Fase 3 — Bidang berbasis data | ❌ **Belum dikerjakan sama sekali** | — |
| Fase 4 — Pie chart bidang di dashboard | ✅ Selesai | `166583e` feat(dashboard): bidang distribution donut chart |
| Fase 5 — Pengawasan tim (Kepala Departemen/Bidang) | ❌ Belum dikerjakan | — |
| Fase 6 — Akun Pemantau (VIEWER) — DTO stripping & UI | ❌ Belum dikerjakan (lihat "Risiko" di bawah) | — |

Urutan commit di atas juga urutan kronologis pengerjaan (dari terlama ke terbaru): `615604e` →
`c50b699` → `f47a6cb` → `6c71bb3` → `166583e`.

---

## ⚠️ Risiko yang perlu diketahui SEBELUM membuat akun VIEWER sungguhan

Role `VIEWER` **sudah berfungsi penuh** di matriks permission (`src/lib/roles.ts`) sejak Fase 1 —
`sla:view` dan `contact:view` sudah `false` untuknya, dan semua endpoint mutasi sudah menolaknya
(403). Dashboard, Mode TV, dan pie chart bidang (Fase 2 & 4) **sudah aman** untuk VIEWER — sudah
diverifikasi live tanpa data SLA/kontak bocor.

**Tapi:** `src/app/(dashboard)/page.tsx` (dashboard utama) dan
`src/app/(dashboard)/tickets/[id]/page.tsx` (detail tiket) **belum** memfilter data berdasarkan
`can(user, 'sla:view')` / `can(user, 'contact:view')`. Keduanya masih mengirim `slaDeadline`,
persentase SLA, `picPhone`, `picEmail` ke client **tanpa memandang role**. Ini keputusan sadar
saat Fase 1 (lihat bagian "Keputusan penting" di bawah) — pekerjaan itu sengaja ditunda ke Fase 6,
karena blueprint sendiri menaruh `toTicketDTO` dan penyembunyian kartu SLA di bagian Fase 6, bukan
Fase 1.

**Implikasi konkret:** kalau seseorang membuat user dengan `role: VIEWER` lewat `/users` atau API
`POST /api/users` **sebelum Fase 6 dikerjakan**, akun itu akan tetap melihat SLA dan kontak PIC di
dashboard serta halaman detail tiket — melanggar aturan keras 0.2.1 di blueprint. **Jangan buat
akun VIEWER produksi sebelum Fase 6 selesai.**

---

## Keputusan penting yang diambil di luar teks blueprint

Semua ini sudah disetujui Indra di sepanjang sesi, dicatat di sini supaya tidak perlu digali ulang
dari chat:

1. **Migration drift `User.password` diselesaikan** (blueprint 0.3 sudah mengantisipasi ini).
   Migration `20260913082730_baseline_user_password_drift` dibuat dengan membandingkan
   rekonstruksi manual riwayat migration (dibaca dari `prisma/migrations/*/migration.sql`)
   terhadap `schema.prisma` — bukan `prisma migrate diff --from-migrations` (itu butuh shadow
   database yang tidak dikonfigurasi). Diterapkan ke DB **dev** dengan `migrate resolve
   --applied`, **bukan** `migrate dev`. Status `prisma migrate status` sudah bersih.
2. **Session invalidation saat ganti/reset password** (bukan bagian asli blueprint, usulan
   hardening yang disetujui). Kolom baru `User.sessionsValidFrom DateTime @default(now())`,
   migration `20260913083406_add_sessions_valid_from`, diterapkan ke DB dev dengan `migrate
   deploy`. `getCurrentUser()` menolak token dengan `iat` lebih lama dari nilai ini. Di-bump di
   tiga tempat: login (upgrade plaintext→bcrypt), ganti password sendiri, reset password oleh
   admin. Ganti password sendiri **menerbitkan cookie sesi baru di response yang sama** supaya
   pengguna tidak ikut ter-logout oleh perubahan yang ia lakukan sendiri.
3. **Hardening login** (bukan bagian asli blueprint): dummy `bcrypt.compare` saat inisial tidak
   ditemukan (mitigasi timing attack), dan rate limit in-memory 5x gagal/15 menit per inisial
   (lihat TODO — tidak efektif di Vercel).
4. **Endpoint reset password oleh admin** (`POST /api/users/[id]/reset-password`) dibuat karena
   blueprint 3.4 menyebutnya tapi tidak mendesainnya. Aturan: hanya `user:manage`, tidak bisa
   reset akun sendiri (diarahkan ke ganti password biasa), dan hanya sesama `OPERATOR` yang boleh
   reset password `OPERATOR` lain.
5. **`picTeam` ditambahkan ke `TicketContext`** (`src/lib/roles.ts`) — perbaikan bug konsistensi:
   `ticketScopeWhere` untuk `KEPALA_BIDANG` mengizinkan tiket berdasarkan kategori ATAU tim PIC-nya,
   tapi `isInBidang` (dipakai `can()` untuk cek permission per-aksi) awalnya hanya cek kategori.
   Sekarang keduanya konsisten.
6. **`sla:view`/`contact:view`/`report:export`/`password:change`** memakai daftar putih role
   eksplisit, bukan pola `role !== 'VIEWER'` (supaya role tidak dikenal ditolak, bukan diloloskan).
7. **Fase 4 — pembatasan klik-through pie chart**: chart selalu berlingkup seluruh departemen
   (K4), tapi klik irisan/legend untuk membuka `/tickets?kategori=` **dimatikan** untuk
   `PIC_LOGISTIK` dan `KEPALA_BIDANG` (lingkup tiket mereka lebih sempit dari data chart, supaya
   angka tidak terlihat seperti bug), tetap aktif untuk `OPERATOR`, `KEPALA_DEPARTEMEN`, `VIEWER`.
   Helper: `hasFullTicketScope()` dan `categoryFilterForBidang()` di `src/lib/roles.ts`.
8. **`src/lib/time.ts`** dibuat sebagai helper WIB bersama (dipakai `tvStats.ts` dan
   `dashboardStats.ts`), sesuai catatan blueprint 4.1. `TvDisplayClient.tsx` (client component)
   mengimpor `wibDayKey` dari sini juga, bukan duplikat helper lokal — supaya dijamin konsisten.
9. **Materi referensi `docs/reference/mode-tv/`** dipakai sebagai acuan Fase 2, TAPI seluruh kode
   auth di dalamnya (cookie `JSON.parse` mentah) ditulis ulang total memakai `getCurrentUser`,
   `requirePermission('tv:view')`, dan helper `roles.ts`. `DashboardClient.tsx` di folder itu
   HANYA diambil bagian tombol Mode TV-nya (ikon, fungsi `openTvMode`, JSX tombol) — file itu versi
   sebelum Fase 1, tidak pernah disalin/ditimpakan utuh.

---

## TODO yang tertunda (dicatat, belum dikerjakan)

1. **Rate limit login tidak efektif di Vercel.** `src/app/api/auth/login/route.ts` pakai `Map`
   in-memory per proses. Di Vercel (serverless, banyak instance/region), batas 5x/15menit berlaku
   per-instance, bukan global — praktis mudah dilewati penyerang yang requestnya tersebar ke
   instance berbeda. **Perlu diganti dengan penyimpanan bersama** (Redis/Upstash, atau tabel
   Postgres) sebelum diandalkan sebagai proteksi utama di produksi. Detail di
   `docs/RELEASE-NOTES.md`.
2. **`ActivityLog` tidak punya jalur untuk aktivitas non-tiket.** Reset password oleh admin
   (`POST /api/users/[id]/reset-password`) hanya dicatat ke `console.log` server, bukan ke tabel
   `ActivityLog` (yang mewajibkan `ticketId`, tidak nullable). Indra sudah memutuskan: **jangan**
   membuat `ticketId` nullable — solusinya nanti tabel log aktivitas user yang terpisah. Belum ada
   migration untuk ini, belum dikerjakan.
3. **`migrate resolve`/`migrate deploy` ke PRODUKSI belum dijalankan.** Kedua migration
   (`20260913082730_baseline_user_password_drift` dan `20260913083406_add_sessions_valid_from`)
   baru diterapkan ke DB **dev**. Sebelum deploy pertama yang membawa migration ke produksi:
   - Jalankan `prisma migrate resolve --applied 20260913082730_baseline_user_password_drift`
     terhadap DB produksi dulu (drift kolom `password` juga ada di produksi).
   - Baru jalankan `prisma migrate deploy` seperti biasa (akan menerapkan
     `add_sessions_valid_from`).
   - **Pakai direct connection Neon (bukan endpoint `-pooler`)** untuk kedua perintah di atas.
   - **Migration `add_sessions_valid_from` akan me-logout SEMUA pengguna produksi satu kali**
     (kolom baru terisi `CURRENT_TIMESTAMP` untuk semua baris lama, otomatis meng-invalidate semua
     sesi yang sedang berjalan). Beri tahu tim dulu sebelum rilis.
   - Detail lengkap dan alasannya ada di `docs/RELEASE-NOTES.md` — baca file itu sebelum deploy
     pertama.
4. **Fase 3, 5, 6 belum dikerjakan** (lihat tabel status di atas). Fase 3 khususnya: jangan kaget
   melihat `p3Initials`/`pembayaranInitials`/`pengadaanInitials` masih hardcoded di
   `src/app/(dashboard)/page.tsx`, `tickets/[id]/TaskViewClient.tsx`, dan
   `tickets/create/CreateTicketClient.tsx` — itu disengaja, instruksi eksplisit "jangan disentuh".

---

## Peta file yang relevan (hasil Fase 1, 2, 4)

**Fondasi auth/permission (Fase 1):**
`src/lib/session.ts`, `src/lib/auth.ts`, `src/lib/roles.ts`, `src/proxy.ts`

**Mode TV (Fase 2):**
`src/lib/time.ts`, `src/lib/tvStats.ts`, `src/app/api/tv/route.ts`, `src/app/tv/page.tsx`,
`src/app/tv/TvDisplayClient.tsx`

**Pie chart bidang (Fase 4):**
`src/lib/dashboardStats.ts`, `src/components/charts/DonutChart.tsx`,
`src/app/(dashboard)/BidangDistributionCard.tsx`, `src/app/api/dashboard/bidang/route.ts`

**Endpoint tambahan (di luar cakupan fase, hardening):**
`src/app/api/users/[id]/reset-password/route.ts`

**Catatan rilis / migration:** `docs/RELEASE-NOTES.md` — baca sebelum deploy produksi apa pun yang
membawa migration.

---

## Cara verifikasi cepat kalau melanjutkan sesi ini

```bash
npx tsc --noEmit          # harus bersih
npm run build             # harus sukses, cek daftar route muncul semua
npx prisma migrate status # harus "Database schema is up to date!" di DB dev
```

Kalau mau uji manual live, pola yang dipakai sepanjang sesi ini: jalankan `npm run dev`, login via
`curl -c cookies.txt -X POST /api/auth/login`, lalu pakai cookie itu untuk uji endpoint/halaman
lain. Akun uji yang tersedia di DB dev: `ABC` (OPERATOR), `AND` (PIC_LOGISTIK, team Lainnya), dan
lain-lain — cek `prisma studio` atau query langsung untuk daftar lengkap. **Jangan pernah jalankan
`prisma/seed.ts`** (menghapus semua tiket dan user).
