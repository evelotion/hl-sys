# Progress Handover — hl-sys Blueprint v2

Dokumen ini merangkum posisi pekerjaan terhadap `docs/BLUEPRINT-hl-sys-v2.md` (bagian bawah,
sudah selesai semua) **dan** `docs/BLUEPRINT-hl-sys-v3-bugfix.md` (bagian atas, sedang berjalan),
supaya sesi Claude Code baru bisa langsung lanjut tanpa membaca riwayat chat sebelumnya. Update
dokumen ini setiap kali sebuah fase selesai atau ada keputusan penting baru.

---

## Status Blueprint v3 (`docs/BLUEPRINT-hl-sys-v3-bugfix.md`) — SEDANG BERJALAN

| Fase | Status | Commit |
|---|---|---|
| Fase 1 — SLA satu rumus | ✅ Selesai | `3eda9db` feat(tickets): unify SLA rule to category-based business days (blueprint v3 fase 1) |
| Fase 2 — Waktu WIB di seluruh aplikasi | ✅ Selesai | `33fa1e2` fix(time): use WIB consistently for display and date comparisons |
| Fase 3 — Nomor tiket anti-tabrakan | ✅ Selesai | `87e3898` fix(tickets): atomic ticket numbering with yearly counter |
| Fase 4 — Bersih-bersih (log re-assign, kode mati, pesan error, hapus user) | ⬜ Belum | — |
| Fase 5 — Pembersihan data pribadi di git history (dikerjakan Indra sendiri) | ⬜ Belum | — |
| Fase 6 — Persiapan deploy | ⬜ Belum | — |

Dikerjakan di luar urutan fase blueprint v3, lebih dulu karena diminta didahulukan:

- **Addendum Mode TV** (`docs/ADDENDUM-mode-tv-v2.md`) — ✅ Selesai. `b0a12c9` feat(tv): oldest
  ticket slide and two-line titles. Slide "Staf terbaik" diganti "Tiket terlama belum selesai"
  (dengan penanda warna umur tiket, bukan SLA), Perihal 2 baris, 5 baris per slide.
- **Kebocoran kredensial PIC di response API tiket** — ✅ Selesai, ditemukan Claude Code saat
  menguji Fase 1 (bukan bagian blueprint manapun, langsung diperbaiki karena hash password
  bcrypt terkirim ke browser). `4f36c30` fix(api): stop leaking pic credentials in ticket
  responses — `PATCH /api/tickets/[id]` sebelumnya memakai `include: { pic: true }` (satu-satunya
  kejadian pola ini di seluruh codebase, sudah disisir) dan branch `UPDATE_STATUS`-nya tidak
  punya `select` sama sekali; keduanya sekarang pakai `select` eksplisit + `toTicketDTO`.

### Detail per fase v3

**Fase 1 (SLA satu rumus):** `src/lib/sla.ts` (baru, satu-satunya sumber `SLA_DAYS`),
`src/lib/holidays.ts` (baru, `HOLIDAYS_WIB` kosong — diisi manual oleh Indra sekali setahun),
`src/lib/businessDays.ts` (`addBusinessDays` sekarang WIB-aware + skip libur).
`api/tickets/route.ts` (create) dan `api/tickets/[id]/route.ts` (edit) sama-sama pakai
`computeSlaDeadline(baseDate, category)`. Edit juga diperbaiki: `requestDate` tidak lagi
ke-reset ke hari ini kalau tidak dikirim, `slaDeadline` cuma dihitung ulang kalau kategori/
tanggal permintaan BENAR-BENAR berubah (dibandingkan per kalender WIB, bukan timestamp
mentah), dan `priority` sekarang tersimpan saat edit (sebelumnya di-drop diam-diam). **Sengaja
tidak ada migrasi data untuk tiket lama** — lihat `docs/RELEASE-NOTES.md` bagian "SLA bercampur
basis" untuk konsekuensinya.

**Fase 2 (waktu WIB):** 5 formatter baru di `src/lib/time.ts` (`formatShortDateWib`,
`formatLongDateWib`, `formatFullDateWib`, `formatDateTimeWib`, `formatTimeWib` — dua yang
terakhir otomatis menambahkan label " WIB"), dipakai di `page.tsx`, `DashboardClient.tsx`,
`tickets/page.tsx`, `TaskViewClient.tsx`, `ReportsClient.tsx` (5 file yang disebut blueprint).
Kolom tanggal Excel di `ReportsClient.tsx` SENGAJA dipertahankan formatnya (bukan diseragamkan
ke formatter kanonik) supaya tetap dikenali Excel sebagai tanggal asli, bukan teks — cuma
`timeZone` yang ditambahkan. Dua bug fungsional (bukan cuma tampilan) ikut ditemukan dan
diperbaiki: banner milestone "selesai hari ini" di `page.tsx` (dulu pakai
`getTimezoneOffset()`, no-op di server UTC) dan argometer SLA% (`getBusinessMinutesBetween` di
`businessDays.ts`, dulu pakai `getDay()` lokal server) — keduanya sekarang WIB-benar.

**Fase 3 (nomor tiket anti-tabrakan):** Model baru `TicketCounter { year, lastNumber }`
(migration `20260915093215_add_ticket_counter`, dibuat lewat `prisma migrate diff` file-ke-file
— **bukan** `migrate dev --create-only`, karena shadow database belum dikonfigurasi di Neon,
sama seperti kasus baseline drift password dulu). `api/tickets/route.ts` sekarang menaikkan
counter DAN membuat tiket dalam satu `db.$transaction` (nol panggilan jaringan/notifikasi di
dalamnya), dibungkus retry maksimal 3x untuk `P2002`/`P2034`. `wibYear()` baru di `time.ts`
menggantikan `new Date().getFullYear()` (satu-satunya pemakaian, sudah dicek lewat grep).
`scripts/seed-ticket-counter.ts` (dry-run default) sudah dijalankan Indra dengan `--apply` ke
DB dev — `TicketCounter` sekarang `{year: 2026, lastNumber: 834}` (823 dari seed + 11 tiket uji
konkurensi yang sudah dihapus lagi, counter tidak turun). Diverifikasi live: 10 request
pembuatan tiket bersamaan → 10 nomor unik berurutan (`LOG-2026-0824` s.d. `0833`), nol error;
satu request yang sengaja gagal validasi (`title: null`) terbukti tidak menghanguskan nomor
(request berikutnya tetap dapat nomor yang sama, membuktikan rollback transaksi bekerja);
`wibYear()` diuji terpisah lintas batas tahun WIB/UTC (31 Des 20.00 UTC → 2027), semua PASS.

**Catatan untuk Fase 4.4 (pesan error generik):** endpoint `POST /api/tickets` yang gagal
validasi (mis. field wajib `null`) sekarang mengembalikan **500 dengan pesan Prisma mentah**
(`PrismaClientValidationError`), bukan 400 dengan pesan yang bisa dipahami pengguna — ditemukan
Indra saat review bukti pengujian Fase 3. Tambahkan ke daftar perbaikan pesan error saat
mengerjakan Fase 4.4.

---

## Status Blueprint v2 (`docs/BLUEPRINT-hl-sys-v2.md`) — SELESAI SEMUA

### Status per fase

| Fase | Status | Commit |
|---|---|---|
| Fase 1 — Fondasi auth & permission | ✅ Selesai | `615604e` feat(auth): signed session, permission matrix, and API authorization<br>`c50b699` fix(auth): harden session and permission checks<br>`f47a6cb` feat(auth): invalidate sessions on password change |
| Fase 2 — Mode TV | ✅ Selesai | `6c71bb3` feat(tv): full-screen TV mode with live rotating slides |
| Fase 3 — Bidang berbasis data | ✅ Selesai | `7953bb0` feat(users): data-driven bidang and role management<br>`0a2bc6d` docs: defer RLY bidang assignment note to Fase 6 |
| Fase 4 — Pie chart bidang di dashboard | ✅ Selesai | `166583e` feat(dashboard): bidang distribution donut chart |
| Fase 5 — Pengawasan tim (Kepala Departemen/Bidang) | ✅ Selesai | `3ce3cde` feat(dashboard): team backlog oversight for kadep and kabid |
| Fase 6 — Akun Pemantau (VIEWER) — DTO stripping & UI | ✅ Selesai | `2dcb95b` feat(users): viewer role with server-side data stripping |

**Semua 6 fase blueprint sudah selesai dan ter-commit.** Urutan commit kronologis (terlama ke
terbaru): `615604e` → `c50b699` → `f47a6cb` → `6c71bb3` → `166583e` → `ff70874` (docs) →
`7953bb0` → `0a2bc6d` → `3ce3cde` → `2dcb95b`.

Fase 6 sudah diverifikasi live terhadap akun VIEWER sungguhan (inisial `RLY`, dipakai orangnya
nanti — bukan akun boneka, jangan dihapus): grep payload RSC dashboard/tickets/detail tiket tidak
mengandung `slaDeadline`/`priority`/`phone`/`requesterEmail`, dan semua endpoint mutasi (create/
edit/hapus/resolve tiket, manajemen user, reset password, upload, contact lookup pengawasan tim)
mengembalikan 403 untuk role ini, sementara `tv`, `dashboard/bidang`, dan ganti password sendiri
mengembalikan 200.

---

## 🚀 Status deploy — BELUM PERNAH deploy ke produksi

**Produksi masih menjalankan versi sebelum Fase 1 dimulai** (sebelum commit `615604e`). Seluruh
pekerjaan Fase 1–6 di atas baru ada di branch `main` lokal/DB **dev**, belum pernah di-push+deploy
ke lingkungan produksi BCA Syariah. Sebelum deploy pertama yang membawa semua ini ke produksi:

1. **Migration** — `20260913082730_baseline_user_password_drift` dan
   `20260913083406_add_sessions_valid_from` baru diterapkan ke DB **dev**. Produksi butuh:
   - `prisma migrate resolve --applied 20260913082730_baseline_user_password_drift` dulu (drift
     kolom `password` juga ada di produksi — kalau langsung `migrate deploy`, akan gagal karena
     coba `ADD COLUMN` yang sudah ada).
   - Baru `prisma migrate deploy` seperti biasa.
   - **Pakai direct connection Neon (bukan endpoint `-pooler`)** untuk kedua perintah di atas.
   - Migration `add_sessions_valid_from` akan **me-logout semua pengguna produksi satu kali**
     (efek samping yang diharapkan, bukan bug) — beri tahu tim dulu.
   - Detail lengkap: `docs/RELEASE-NOTES.md`.
2. **Backfill bidang (Fase 3)** — `npm run backfill:bidang -- --apply` sudah dijalankan ke DB
   **dev** (dikonfirmasi: distribusi `User.team` sekarang P3/Pengadaan/Pembayaran sesuai
   pemetaan, bukan `Lainnya` semua lagi). **Belum dijalankan ke produksi.** Kalau lupa: semua
   user produksi tetap `Lainnya`, dan dropdown PIC di halaman buat/edit tiket akan **kosong**
   untuk kategori P3/Pengadaan/Pembayaran (karena filter PIC sekarang berdasarkan `User.team`,
   bukan lagi daftar inisial hardcoded). Inisial `RLY` sengaja tidak ikut backfill otomatis
   (lihat catatan Fase 6 di bawah — statusnya sekarang VIEWER, bukan lagi butuh bidang).
3. **Env `SESSION_SECRET`** — pastikan sudah diisi di Vercel produksi (minimal 32 byte acak)
   sebelum deploy; tanpa ini aplikasi akan gagal jelas saat start (sengaja, bukan fallback diam).
4. Belum ada checklist uji manual lintas role formal (blueprint bagian 10) yang dijalankan
   end-to-end di lingkungan staging/produksi — sejauh ini verifikasi dilakukan per-fase di DB dev.

---

## 📋 Pekerjaan di luar lingkup blueprint ini (blueprint bagian 9) — belum dikerjakan

Blueprint eksplisit menandai ini sebagai bug yang **sudah diketahui, dikerjakan terpisah, jangan
disentuh kecuali diminta**. Belum ada satupun yang dikerjakan sepanjang Fase 1–6:

1. Logika SLA yang berbeda antara create (berdasarkan prioritas, hari kerja) dan edit
   (berdasarkan kategori, hari kalender).
2. Field `priority` yang tidak tersimpan saat edit tiket.
3. Format tanggal di halaman lama yang belum memakai WIB.
4. Race condition nomor tiket (`ticketNumber`, lihat `src/app/api/tickets/route.ts`).
5. Log "Re-assign" palsu di jejak aktivitas tiket.
6. Kode mati: `/api/upload` tidak dipakai (fitur upload sekarang lewat Cloudinary langsung dari
   client — perlu dikonfirmasi ulang), begitu juga `tickets/[id]/resolve/route.ts` dan
   `src/lib/actions.ts`.
7. Pembersihan `prisma/seed.ts` dan git history (seed masih berisi data dummy lama;
   **jangan pernah dijalankan** — lihat peringatan di bawah).

---

## ⚠️ Risiko VIEWER — SUDAH SELESAI di Fase 6 (dulu jadi peringatan, sekarang tinggal catatan historis)

Sebelumnya dokumen ini memperingatkan: jangan buat akun VIEWER produksi sebelum Fase 6 selesai,
karena dashboard dan detail tiket masih mengirim SLA/kontak tanpa filter. **Fase 6 sudah
menutup celah ini** — `src/lib/ticketDto.ts` (`toTicketDTO`) dan `formatTicketData` di
`src/app/(dashboard)/page.tsx` sekarang menghapus (bukan menyembunyikan) field `slaDeadline`,
`priority`, `pic.phone`, `pic.email`, `requesterEmail` dari payload untuk role tanpa
`sla:view`/`contact:view`. Sudah diverifikasi live (lihat ringkasan di atas). Aman membuat akun
VIEWER produksi kapan saja setelah deploy Fase 6.

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
6. **`sla:view`/`contact:view`/`report:export`** memakai daftar putih role eksplisit
   (`SLA_CONTACT_EXPORT_ROLES`), bukan pola `role !== 'VIEWER'` (supaya role tidak dikenal
   ditolak, bukan diloloskan). **`password:change` sengaja dipisah dari daftar ini sejak Fase 6**
   (lihat poin 10) — VIEWER termasuk di `password:change` tapi tidak di tiga permission lainnya.
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
10. **VIEWER boleh ganti password sendiri** (penyesuaian dari blueprint Fase 6 di tengah sesi).
    Asumsi awal "akun bersama" tidak berlaku lagi — dipakai staf administratif dengan akun
    pribadi. `password:change` dipisah dari `SLA_CONTACT_EXPORT_ROLES` dan sekarang `true` untuk
    semua role valid termasuk VIEWER (whitelist `VALID_ROLES`, bukan `true` polos, supaya role
    tak dikenal tetap ditolak). Menu "Ganti Password" tetap muncul untuk VIEWER di sidebar.
11. **`toTicketDTO`** (`src/lib/ticketDto.ts`, Fase 6) menghapus field sensitif dari objek tiket
    (bukan menggantinya dengan nilai default) sebelum jadi props Client Component — `page.tsx`
    dashboard menerapkan pola yang sama secara manual di `formatTicketData` (key `sla`/`priority`/
    `picPhone`/`picEmail` tidak pernah ditulis ke objek kalau permission tidak mengizinkan).
    Query "SLA Kritis" (`activeSlaTickets`, diurutkan berdasarkan `slaDeadline`) juga dilewati
    sepenuhnya (bukan dihitung lalu disembunyikan) untuk role tanpa `sla:view`.
12. **`reports/page.tsx` sebelumnya tidak mengecek permission sama sekali** untuk export Excel —
    celah ini ditemukan dan ditutup di Fase 6. Sekarang seluruh fetch data tiket + render
    `<ReportsClient>` digerbang `can(user, 'report:export')`; role tanpa izin (VIEWER) dapat
    pesan informatif, bukan data maupun tombol export.
13. **Bug form `/users` saat mengubah role jadi VIEWER** (ditemukan Indra, diperbaiki di commit
    `2dcb95b`): form mengirim `team: ''` (bukan menghapus field-nya) saat role diganti ke VIEWER,
    dan server menolaknya sebagai "Bidang tidak valid" (string kosong dianggap dikirim tapi tidak
    valid) — tapi client menampilkan pesan generik "Inisial mungkin sudah dipakai" yang menutupi
    penyebab asli. Diperbaiki dengan menghapus key `team` dari payload saat role VIEWER, plus
    toast error sekarang menampilkan pesan asli dari server, dan API `/api/users` menangani
    konflik inisial duplikat (Prisma `P2002`) dengan pesan spesifik alih-alih generik 500.

---

## TODO operasional yang tertunda (dicatat, belum dikerjakan)

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
3. **Deploy produksi belum pernah dilakukan** — lihat bagian "Status deploy" di atas untuk
   urutan lengkap (migration, backfill, env) sebelum deploy pertama.
4. **Pekerjaan blueprint bagian 9** — lihat daftar di atas, belum dikerjakan (memang di luar
   lingkup, tunggu diminta eksplisit).

---

## Peta file yang relevan (hasil Fase 1–6)

**Fondasi auth/permission (Fase 1):**
`src/lib/session.ts`, `src/lib/auth.ts`, `src/lib/roles.ts`, `src/proxy.ts`

**Mode TV (Fase 2):**
`src/lib/time.ts`, `src/lib/tvStats.ts`, `src/app/api/tv/route.ts`, `src/app/tv/page.tsx`,
`src/app/tv/TvDisplayClient.tsx`

**Bidang berbasis data (Fase 3):**
`scripts/backfill-bidang.ts`, `src/app/(dashboard)/users/UserClient.tsx`,
`src/app/(dashboard)/tickets/[id]/TaskViewClient.tsx`,
`src/app/(dashboard)/tickets/create/CreateTicketClient.tsx`

**Pie chart bidang (Fase 4):**
`src/lib/dashboardStats.ts`, `src/components/charts/DonutChart.tsx`,
`src/app/(dashboard)/BidangDistributionCard.tsx`, `src/app/api/dashboard/bidang/route.ts`

**Pengawasan tim (Fase 5):**
`src/lib/teamOversight.ts`, `src/app/(dashboard)/TeamBacklogSection.tsx`,
`src/app/(dashboard)/TeamDigestPopup.tsx`,
`src/app/api/team-oversight/contact/[userId]/route.ts`

**Akun Pemantau / VIEWER (Fase 6):**
`src/lib/ticketDto.ts`, `src/app/(dashboard)/layout.tsx` (banner VIEWER),
`src/app/(dashboard)/reports/page.tsx` (gate `report:export`)

**Endpoint tambahan (di luar cakupan fase, hardening):**
`src/app/api/users/[id]/reset-password/route.ts`

**Catatan rilis / migration:** `docs/RELEASE-NOTES.md` — baca sebelum deploy produksi apa pun yang
membawa migration atau backfill.

---

## Cara verifikasi cepat kalau melanjutkan sesi ini

```bash
npx tsc --noEmit          # harus bersih
npm run build             # harus sukses, cek daftar route muncul semua
npx prisma migrate status # harus "Database schema is up to date!" di DB dev
```

Kalau mau uji manual live, pola yang dipakai sepanjang sesi ini: jalankan `npm run dev`, login via
`curl -c cookies.txt -X POST /api/auth/login`, lalu pakai cookie itu untuk uji endpoint/halaman
lain. Akun uji yang tersedia di DB dev: `ABC` (KEPALA_DEPARTEMEN), `FER` (KEPALA_BIDANG, team P3),
`RLY` (VIEWER — akun sungguhan, **jangan dihapus**), dan lain-lain (mayoritas `PIC_LOGISTIK`) — cek
`prisma studio` atau query langsung untuk daftar lengkap. **Jangan pernah jalankan
`prisma/seed.ts`** (menghapus semua tiket dan user), dan **jangan mengubah role user lewat script**
— selalu lewat `/users` atau minta Indra yang menjalankan skrip data (mis. backfill `--apply`).
