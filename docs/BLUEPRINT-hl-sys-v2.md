# Blueprint hl-sys v2: Role, Pengawasan Tim, Pie Bidang, Akun Pemantau, Mode TV

Dokumen ini adalah instruksi kerja untuk Claude Code. Baca seluruhnya sebelum menulis kode, lalu kerjakan **per fase, berurutan**. Berhenti di akhir setiap fase dan laporkan hasilnya ke Indra sebelum lanjut.

---

## 0. Konteks dan aturan main

### 0.1 Tentang aplikasi
- hl-sys adalah helpdesk tiket internal Departemen Logistik BCA Syariah. Next.js 16 (App Router, Turbopack), React 19, Prisma 7 + `@prisma/adapter-pg` (Neon Postgres), Tailwind v4, framer-motion, lucide-react. Deploy di Vercel.
- **Wajib baca `AGENTS.md`**: versi Next.js ini punya breaking changes. Cek dokumentasi di `node_modules/next/dist/docs/` sebelum memakai API Next. Contoh: di Next 16, `middleware.ts` sudah menjadi `proxy.ts`.
- Kategori tiket (`Ticket.category`) sekaligus menunjukkan bidang: `P3`, `Pengadaan`, `Pembayaran`. Nilai lain (termasuk default `Umum`) dianggap `Lainnya`.

### 0.2 Aturan keras (tidak boleh dilanggar)
1. **SLA tidak boleh terlihat oleh siapa pun di luar Departemen Logistik.** SLA mencakup `slaDeadline`, persentase SLA, status "lewat SLA", dan label prioritas yang dikaitkan dengan SLA. Untuk role/halaman yang bisa dilihat pihak luar Logistik (akun Pemantau, Mode TV), field SLA **tidak boleh dikirim dari server sama sekali**. Menyembunyikannya lewat CSS atau kondisi di UI tidak cukup.
2. **Jangan kirim password atau PII yang tidak perlu ke client.** Setiap query yang hasilnya dikirim ke client wajib memakai `select` eksplisit. Jangan pernah memakai `include: { user: true }` atau `include: { pic: true }` tanpa `select`.
3. **Otorisasi selalu dicek di server** (API route, server component, server action), berdasarkan user yang dimuat dari database. Kondisi di UI hanya untuk tampilan.
4. **Waktu selalu WIB.** Server Vercel berjalan di UTC. Semua format tanggal wajib memakai `timeZone: 'Asia/Jakarta'`, dan batas hari/bulan dihitung dengan offset UTC+7 (lihat helper di Fase 2).
5. **Jangan menambah dependency baru** kecuali disebut eksplisit di dokumen ini. Chart dibuat dengan SVG manual.

### 0.3 Aturan database (penting, ada risiko kehilangan data)
- **Jangan pernah menjalankan `prisma/seed.ts`.** File ini menghapus semua tiket dan user.
- **Jangan pernah menjalankan `prisma migrate reset`, `prisma db push`, atau perintah apa pun yang menawarkan reset**, terhadap `DATABASE_URL` mana pun, tanpa izin eksplisit Indra.
- **Sudah diketahui ada migration drift.** Kolom `User.password` ada di `schema.prisma`, tetapi tidak ada di folder `prisma/migrations`. Kemungkinan dulu ditambahkan lewat `db push`. Akibatnya, `prisma migrate dev` kemungkinan akan mendeteksi drift dan menawarkan reset. **Jika itu terjadi, BERHENTI dan laporkan.** Solusi yang disarankan (jalankan hanya setelah disetujui):
  1. Buat migration baseline untuk drift dengan `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`, lalu simpan hasilnya sebagai folder migration baru.
  2. Tandai migration itu sebagai sudah diterapkan di DB produksi dengan `prisma migrate resolve --applied <nama_migration>`.
- Blueprint ini sengaja dirancang **tanpa perubahan schema**, karena `User.role` sudah berupa `String` dan `User.team` sudah ada. Kalau di tengah jalan ternyata butuh perubahan schema, buat migration dengan `--create-only`, tunjukkan SQL-nya ke Indra, dan tunggu persetujuan.

### 0.4 Protokol kerja Claude Code
- Satu fase = satu commit dengan pesan yang jelas, misalnya `feat(auth): signed session + permission matrix`. Jangan pakai pesan "update".
- Di akhir setiap fase: jalankan `npx tsc --noEmit` dan `npm run lint`. Error baru dari file yang kamu sentuh wajib diperbaiki.
- Laporan akhir setiap fase berisi: daftar file yang berubah, keputusan yang diambil dari bagian "Keputusan terbuka", dan checklist uji manual.
- Jangan pernah mencetak nilai environment variable ke log atau output.
- Jika instruksi di dokumen ini bertentangan dengan kode yang ada, jangan menebak. Tanyakan.

---

## 1. Keputusan terbuka (pakai default ini, dan sebutkan di laporan)

| # | Pertanyaan | Default yang dipakai |
|---|---|---|
| K1 | Akun Pemantau dipakai hanya oleh staf Logistik, atau juga oleh karyawan di luar Logistik? | Anggap **bisa dilihat pihak luar Logistik**. Karena itu SLA dan kontak pribadi di-strip untuk role ini. |
| K2 | Kepala Departemen bisa di-assign tiket sebagai PIC? | **Tidak.** Yang bisa di-assign: `PIC_LOGISTIK`, `KEPALA_BIDANG`, dan `OPERATOR` (perilaku lama: operator selalu muncul di semua kategori). |
| K3 | Lingkup dashboard utama Kepala Bidang | **Seluruh tiket di bidangnya** (kategori = bidangnya, ditambah tiket yang PIC-nya anggota bidangnya). |
| K4 | Pie chart bidang di dashboard: lingkup data | **Seluruh departemen**, untuk semua role, dengan filter periode *Bulan ini / Tahun ini / Semua*. Data berupa jumlah saja, tanpa SLA. |
| K5 | Siapa yang boleh mengelola user (`/users`) | `OPERATOR` dan `KEPALA_DEPARTEMEN`. |
| K6 | Akun Pemantau boleh membuka halaman Reports dan export Excel? | Boleh melihat, **tidak boleh export**. |
| K7 | Target apresiasi di Mode TV (total tiket selesai) | `[10, 25, 50, 100, 150, 200, 300, 500, 1000]`, tayang 3 hari sejak tercapai. |

---

## 2. Model role dan permission

### 2.1 Role (disimpan di `User.role`, tipe String)
| Konstanta | Label UI | Keterangan |
|---|---|---|
| `OPERATOR` | Operator (Admin) | Admin helpdesk. Sudah ada. |
| `KEPALA_DEPARTEMEN` | Kepala Departemen | Baru. Mengawasi semua bidang. |
| `KEPALA_BIDANG` | Kepala Bidang | Baru. Mengawasi bidangnya sendiri (`User.team`), dan juga bisa menerima tiket. |
| `PIC_LOGISTIK` | PIC Logistik | Sudah ada. |
| `VIEWER` | Akun Pemantau | Baru. Hanya bisa melihat, akun bersama. |

### 2.2 Bidang (disimpan di `User.team`)
Nilai yang valid: `P3`, `Pengadaan`, `Pembayaran`, `Lainnya`. Buat konstanta `BIDANG` di `src/lib/roles.ts` beserta helper `bidangOfCategory(category: string): Bidang` yang memetakan kategori tiket ke bidang (nilai di luar tiga bidang utama menjadi `Lainnya`).

### 2.3 Matriks permission
Buat `src/lib/roles.ts` yang berisi daftar role, daftar permission, dan fungsi `can(user, permission, context?)`. **Semua pengecekan role di seluruh codebase wajib lewat helper ini.**

| Permission | OPERATOR | KEPALA_DEPARTEMEN | KEPALA_BIDANG | PIC_LOGISTIK | VIEWER |
|---|---|---|---|---|---|
| `dashboard:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ticket:view` (lingkup) | semua | semua | bidangnya | miliknya | semua |
| `ticket:create` | ✅ | ✅ | ✅ | ❌ (perilaku lama) | ❌ |
| `ticket:edit` / assign | ✅ | ✅ | bidangnya | ❌ | ❌ |
| `ticket:delete` | ✅ | ✅ | bidangnya | ❌ | ❌ |
| `ticket:status` | ✅ | ✅ | bidangnya | tiket miliknya | ❌ |
| `ticket:comment` | ✅ | ✅ | ✅ (dalam lingkupnya) | tiket miliknya | ❌ |
| `sla:view` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `contact:view` (HP/email PIC & pemohon, tombol WA/Teams) | ✅ | ✅ | ✅ | ✅ | ❌ |
| `team:oversee` (pop up + section tim) | ❌ | ✅ semua bidang | ✅ bidangnya | ❌ | ❌ |
| `user:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `report:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `report:export` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `password:change` | ✅ | ✅ | ✅ | ✅ | ❌ (akun bersama) |
| `tv:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bisa di-assign sebagai PIC | ✅ | ❌ (K2) | ✅ | ✅ | ❌ |

Tambahkan `isAssignable(user)` dan `ticketScopeWhere(user): Prisma.TicketWhereInput`. Lingkup Kepala Bidang ditulis sebagai:

```ts
{ OR: [{ pic: { team: user.team } }, { category: user.team }] }
```

Untuk bidang `Lainnya`, lingkupnya adalah tiket yang kategorinya bukan tiga bidang utama.

---

## 3. Fase 1: Fondasi auth dan permission (prasyarat semua fase lain)

**Mengapa fase ini harus pertama.** Saat ini session cookie berisi JSON polos (`{id, name, role}`) yang bisa diubah sendiri oleh user, login hanya mengecek string `password123`, dan semua API tidak mengecek session. Selama kondisi ini masih ada, siapa pun bisa mengaku sebagai Kepala Departemen, dan akun Pemantau yang "hanya bisa melihat" tetap bisa menghapus tiket lewat API. Fitur role di fase-fase berikutnya baru ada artinya setelah fase ini selesai.

### 3.1 Session yang ditandatangani
- Buat `src/lib/session.ts` dengan HMAC-SHA256 memakai **Web Crypto (`crypto.subtle`)**, supaya jalan di runtime proxy maupun Node. Tidak perlu dependency baru.
- Secret diambil dari env `SESSION_SECRET`, minimal 32 byte acak. Jika env ini tidak ada, aplikasi harus **gagal jelas**, tanpa fallback. Tambahkan `SESSION_SECRET` ke dokumentasi env; Indra akan mengisinya di Vercel.
- Isi payload: `{ uid, sid, iat, exp }`. `sid` adalah UUID acak per login dan dipakai untuk pop up di Fase 5. **Role tidak disimpan di cookie.**
- Durasi session:
  - Role biasa: 12 jam.
  - `VIEWER`: 7 hari (supaya perangkat TV tidak harus login setiap hari).
- Cookie `hl_session`: `httpOnly`, `secure` di production, `sameSite: 'lax'`, `path: '/'`.
- Buat `getCurrentUser()` di `src/lib/auth.ts`. Fungsi ini memverifikasi cookie, memuat user dari DB dengan `select` aman (`id, initial, name, role, team`), dan mengembalikan `null` jika ada yang tidak valid.
- Buat juga `requireUser()` dan `requirePermission(perm, ctx?)`:
  - Di API route, lempar/return 401 atau 403.
  - Di page, `redirect('/login')` atau tampilkan halaman 403 sederhana.
- Ganti **semua** `JSON.parse(cookieStore.get('user_session')...)` di codebase dengan `getCurrentUser()`.

### 3.2 Login
- Verifikasi password terhadap `User.password` di DB. Hapus hardcode `password123`.
- **Kompatibilitas data lama:** kalau password di DB bukan hash bcrypt (tidak diawali `$2`) dan sama persis dengan input, izinkan login, lalu **langsung simpan versi hash bcrypt-nya**. Dengan cara ini tidak ada user yang terkunci.
- Response login hanya boleh berisi `{ success: true }`. Jangan kembalikan objek user.
- Hapus fitur auto-isi password dari query `?pwd=` di halaman login. Parameter `?nip=` boleh tetap ada.
- Pesan error login dibuat sama untuk "inisial tidak ada" dan "password salah": "Inisial atau password salah." Tujuannya supaya daftar inisial tidak bisa ditebak lewat pesan error.
- Change password: ambil user dari `getCurrentUser()`, tolak role `VIEWER`, bandingkan password lama hanya dengan bcrypt (hapus perbandingan plaintext), dan wajibkan password baru minimal 8 karakter.

### 3.3 Proxy (pengganti middleware)
- Buat `src/proxy.ts` sesuai konvensi Next 16 (cek docs lokal).
- Semua halaman selain `/login` wajib punya session yang valid. Kalau tidak ada, redirect ke `/login`.
- Semua `/api/*` selain `/api/auth/login` wajib punya session yang valid. Kalau tidak ada, balas 401 JSON.
- Proxy hanya mengecek keaslian session. Pengecekan role tetap dilakukan di masing-masing route/page.

### 3.4 Guard di semua API
| Route | Permission |
|---|---|
| `POST /api/tickets` | `ticket:create` |
| `PATCH /api/tickets/[id]`, action `UPDATE_STATUS` | `ticket:status` (dengan konteks tiket) |
| `PATCH /api/tickets/[id]`, action `ADD_COMMENT` | `ticket:comment` |
| `PATCH /api/tickets/[id]`, edit penuh | `ticket:edit` |
| `DELETE /api/tickets/[id]` | `ticket:delete` |
| `POST /api/users`, `PATCH`/`DELETE /api/users/[id]` | `user:manage` |
| `/api/notifications` | lingkup memakai `ticketScopeWhere` |
| `/api/upload` | user login selain `VIEWER` |

Aturan tambahan untuk semua route di atas:
- **`userId` untuk activity log diambil dari session**, bukan dari body request.
- **Whitelist field** untuk create/update user. Hanya boleh: `initial, name, phone, email, role, team`. `password` hanya boleh di-set lewat endpoint khusus reset password oleh `user:manage`, dan disimpan dalam bentuk hash.
- Validasi `role` dan `team` terhadap konstanta. Tolak nilai yang tidak dikenal.
- Tidak boleh ada user yang menurunkan role-nya sendiri atau menghapus akunnya sendiri.

### 3.5 Guard di semua halaman, dan pembersihan data ke client
- `/users` memakai `user:manage`. **Hapus dev lock client-side** (password hardcoded di `UserClient.tsx`).
- Seluruh `src/app/(dashboard)/**`: audit setiap query yang hasilnya dikirim ke client dan ganti dengan `select` eksplisit:
  - `users/page.tsx`: jangan kirim `password`.
  - `tickets/[id]/page.tsx`: `logs.user` cukup `{ name, initial, role }`, dan `currentUser` berasal dari `getCurrentUser()`.
  - `reports/page.tsx`: `pic` cukup `{ name, initial, team }`.
  - `page.tsx` (dashboard): `include: { tasks: true }` dan `include: { pic: true }` diganti dengan `select`.
- Ganti semua pengecekan role yang tersebar dengan `can(...)`. Titik yang sudah diketahui:
  - `userRole !== 'PIC_LOGISTIK'` di `TicketClient.tsx` (tombol Buat Tiket) dan `DashboardClient.tsx` (beban kerja PIC, dua tempat). **Penting:** tanpa perbaikan ini, role baru seperti `VIEWER` otomatis masuk ke cabang "bukan PIC" dan mendapat tampilan admin.
  - `isHead = ['ABC','FER','RML','RIN']...` di `TaskViewClient.tsx` dan `api/notifications/route.ts`.
  - `userRole === 'OPERATOR'` di `SidebarNav.tsx` (menu Manajemen User).
- Komponen client menerima **objek permission yang sudah dihitung di server**, misalnya `perms: { canCreate, canEdit, canSeeSla, ... }`. Client tidak menghitung permission sendiri dari string role.

### 3.6 Kriteria selesai Fase 1
- [ ] Mengubah isi cookie secara manual membuat session ditolak.
- [ ] `curl` ke `DELETE /api/tickets/<id>` tanpa cookie mendapat 401. Dengan cookie `VIEWER` mendapat 403.
- [ ] Login dengan password yang sudah diganti berhasil, dan `password123` untuk akun tersebut ditolak.
- [ ] Mencari string `password` di payload RSC halaman `/users`, `/tickets/[id]`, dan `/reports` tidak menemukan hasil.
- [ ] Tidak ada lagi `JSON.parse` terhadap cookie, maupun daftar inisial hardcoded untuk menentukan kepala.

---

## 4. Fase 2: Mode TV

Fitur layar penuh untuk ditayangkan di TV kantor, dengan slide yang berganti otomatis dan data live. Referensi implementasi sudah pernah dibuat (paket `hl-sys-mode-tv.zip`). Jika isinya diletakkan di `docs/reference/mode-tv/`, pakai sebagai acuan, lalu sesuaikan dengan helper `getCurrentUser` dan `roles.ts` dari Fase 1.

### 4.1 File
| File | Isi |
|---|---|
| `src/lib/time.ts` (baru) | Helper WIB, dipakai bersama oleh fitur lain. |
| `src/lib/tvStats.ts` | `getTvData(): Promise<TvData>` dan `TV_CONFIG`. |
| `src/app/api/tv/route.ts` | `GET`, `requirePermission('tv:view')`, header `Cache-Control: no-store`. |
| `src/app/tv/page.tsx` | Di luar route group `(dashboard)` supaya tanpa sidebar. Font Poppins via `next/font/google`. Memuat data awal di server. |
| `src/app/tv/TvDisplayClient.tsx` | Tampilan dan logika slide. |
| `DashboardClient.tsx` | Tambah tombol **Mode TV** (ikon `MonitorPlay`) di sebelah lonceng notifikasi. |

### 4.2 Helper WIB (`src/lib/time.ts`)
```ts
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
export const wibDayKey = (d: Date) => new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
export function startOfWibDay(d: Date) { const s = new Date(d.getTime() + WIB_OFFSET_MS); s.setUTCHours(0,0,0,0); return new Date(s.getTime() - WIB_OFFSET_MS); }
export function startOfWibMonth(d: Date) { const s = new Date(d.getTime() + WIB_OFFSET_MS); s.setUTCDate(1); s.setUTCHours(0,0,0,0); return new Date(s.getTime() - WIB_OFFSET_MS); }
```

### 4.3 Kontrak data
`getTvData` wajib memakai `Promise.all` untuk query-query yang independen, dan hanya `select` kolom berikut. **Tanpa field SLA, prioritas, HP, email, maupun password.**

```ts
interface TvData {
  generatedAt: string;
  periodLabel: string; // "September 2026"
  today: { masuk: number; selesai: number; menunggu: number; diproses: number };
  trend: { date: string; label: string; masuk: number; selesai: number; isToday: boolean; isWeekend: boolean }[]; // 14 hari, WIB
  monthTotal: number;
  categories: { name: string; count: number }[];               // bulan berjalan
  branchCount: number;
  branches: { name: string; count: number; selesai: number }[]; // top 10 bulan berjalan
  latest: { id; ticketNumber; title; branch; category; status; picName; picInitial; createdAt }[]; // 8 terbaru
  staff: { rank: number; name: string; initial: string; count: number }[];   // top 10 selesai bulan ini, ranking seri (1,2,2,4)
  milestones: { name: string; initial: string; target: number; reachedAt: string }[];
}
```

Aturan pengolahan data:
- **Nama cabang:** di-normalisasi dengan `trim`, spasi ganda dirapikan, lalu uppercase. Input di form memang bebas teks.
- **Milestone:** untuk tiap PIC, urutkan tiket `DONE` berdasarkan `resolvedAt`. Tiket ke-N adalah saat target N tercapai. Tampilkan target tertinggi yang tercapai dalam `milestoneWindowDays` terakhir.
- **Leaderboard dan milestone** hanya berisi user yang bisa di-assign. `VIEWER` tidak pernah muncul.

### 4.4 Perilaku
- **Slide, berganti otomatis:**
  1. Ringkasan (20 detik): pita 4 angka, grafik batang SVG masuk vs selesai 14 hari, dan bar kategori.
  2. Cabang & unit teraktif (15 detik).
  3. Tiket terbaru (15 detik), dengan label "Baru" untuk tiket yang umurnya kurang dari 60 menit.
  4. Staf terbaik (15 detik): podium 1–3 dan daftar 4–10.
  5. Apresiasi (15 detik): **hanya muncul jika ada milestone.** Tampilkan "Selamat!", confetti bernuansa brand (hormati `prefers-reduced-motion`), dan kalimat "telah menyelesaikan total N tiket hari ini/kemarin/pada …".
- **Satu klik tombol Mode TV:** panggil `document.documentElement.requestFullscreen()` di handler klik, lalu `router.push('/tv')`. Karena navigasinya client-side, fullscreen tetap aktif. Jika fullscreen ditolak browser, tetap navigasi ke `/tv`.
- **Kanvas tetap 1920×1080** yang di-`scale` supaya pas di layar apa pun, dengan `transform: translate(-50%,-50%) scale(min(vw/1920, vh/1080))`.
- **Polling `/api/tv`** setiap 30 detik, plus saat event `online`.
- **Kalau ada tiket baru** (id belum pernah terlihat), header diganti banner kuning selama 12 detik.
- **Status koneksi:**
  - 401 → overlay "Sesi login di perangkat ini sudah berakhir" dengan tombol Login ulang.
  - Error jaringan → tetap tampilkan data terakhir, dengan indikator "Koneksi terputus, data pukul …".
- **Screen Wake Lock:** diminta saat halaman aktif, dan diminta ulang saat event `visibilitychange`.
- **Kontrol:** muncul saat mouse bergerak, sembunyi setelah 3 detik tanpa aktivitas. Isinya: sebelumnya, jeda, berikutnya, layar penuh, keluar. Keyboard: `←`/`→` pindah slide, spasi untuk jeda, `F` untuk layar penuh.
- **Rotasi slide** memakai `useReducer` (`index`, `elapsed`) dengan interval 250 ms. Bagian konten slide dibungkus `memo` supaya tidak ikut re-render setiap tick.
- **Jam dan tanggal di-render hanya di client** setelah mount (awal `null`), supaya tidak terjadi hydration mismatch.

### 4.5 Tampilan
- **Palet resmi BCA Syariah:**
  - Deep Horizon `#0066B3`
  - Fresh Tide `#00A6B6` (selesai)
  - Clear Sky `#00AAFF` (masuk/diproses)
  - Morning Glow `#FFE600` (juara 1, tiket baru, apresiasi)
  - Latar `#00355F`. Saat slide Apresiasi, latar berubah ke `#0066B3`.
- Font Poppins. Teks dalam sentence case, tanpa label all-caps. Angka memakai `tabular-nums`.
- Header berisi: "Hotline Logistik BCA Syariah", judul slide, dan subjudul. Di kanan: jam WIB dan status live. Footer: progress bar per slide beserta labelnya.

### 4.6 Kriteria selesai Fase 2
- [ ] Klik Mode TV langsung masuk fullscreen, tampil di `/tv` tanpa sidebar.
- [ ] Response `/api/tv` tidak mengandung kata `sla`, `priority`, `phone`, `email`, maupun `password`.
- [ ] Jam dan tanggal di TV sesuai WIB, termasuk saat diakses antara pukul 00.00–07.00 WIB.
- [ ] Tiket baru yang dibuat di tab lain muncul di TV dalam waktu ≤ 30 detik, beserta bannernya.

---

## 5. Fase 3: Bidang berbasis data (hapus daftar inisial hardcoded)

1. **Backfill `User.team`.** Buat `scripts/backfill-bidang.ts` yang membaca pemetaan inisial → bidang dari **daftar hardcoded yang ada saat ini** di `src/app/(dashboard)/page.tsx`. Aturan script:
   - Hanya mengisi user yang `team`-nya masih `Lainnya`.
   - Default berjalan dalam mode **dry-run**, yang hanya mencetak jumlah perubahan per bidang tanpa mencetak nama.
   - Perubahan baru benar-benar ditulis ke DB jika dijalankan dengan flag `--apply`.
   - **Jangan jalankan `--apply` sendiri.** Minta Indra yang menjalankannya.
2. **Ganti ketiga daftar inisial hardcoded** (`p3Initials`, `pembayaranInitials`, `pengadaanInitials`) di `page.tsx`, `TaskViewClient.tsx`, dan `CreateTicketClient.tsx` dengan data dari DB:
   - Daftar PIC yang boleh dipilih = user yang `isAssignable` **dan** `team === bidangOfCategory(kategori)`.
   - Ditambah `OPERATOR`, sesuai perilaku lama: operator selalu muncul di semua kategori.
3. **Query daftar PIC** (`where: { role: 'PIC_LOGISTIK' }` di `tickets/create/page.tsx`, `tickets/[id]/page.tsx`, dan dashboard) diganti menjadi `where: { role: { in: ASSIGNABLE_ROLES } }`. **Tanpa ini, user yang diubah menjadi `KEPALA_BIDANG` akan hilang dari daftar PIC.**
4. **Pengelompokan "Beban Kerja PIC"** di dashboard dilakukan berdasarkan `team`, bukan daftar inisial.
5. **Form di `/users`** diubah:
   - Tambah `select` untuk role (5 role, dengan label UI dari bagian 2.1) dan `select` untuk bidang.
   - Bidang wajib diisi untuk `KEPALA_BIDANG` dan `PIC_LOGISTIK`, dan disembunyikan untuk `VIEWER`.
   - Badge role memakai label UI, bukan `role.replace('_',' ')`.

**Kriteria selesai Fase 3:**
- [ ] Mencari `Initials = [` dan `'ABC'` di `src/` tidak menemukan hasil.
- [ ] Mengubah seorang PIC menjadi Kepala Bidang tidak membuatnya hilang dari dropdown PIC di bidangnya.

---

## 6. Fase 4: Pie chart bidang di dashboard (semua role)

- **Komponen:** `src/components/charts/DonutChart.tsx`, SVG murni dan reusable.
  - Props: `slices: { key, label, value, color }[]`, `centerLabel`, `centerValue`.
  - Irisan digambar dengan `stroke-dasharray` pada `<circle>`, atau dengan path arc.
  - Legend berisi label, jumlah, dan persen (warna bukan satu-satunya penanda). Beri `role="img"` dan `aria-label` yang menjelaskan isi chart.
- **Data:** server action atau fungsi `getBidangBreakdown(period)` di `src/lib/dashboardStats.ts`.
  - Grup berdasarkan `bidangOfCategory(category)`.
  - Periode: `month`, `year`, atau `all`, dengan batas waktu dalam WIB.
  - Setiap bidang juga menghitung rincian status: menunggu, diproses, selesai.
  - Lingkup data: **seluruh departemen** (K4). Tanpa field SLA.
- **Letak:** kartu "Distribusi tiket per bidang" di dashboard, di bawah KPI, dan **tampil untuk semua role termasuk VIEWER**.
  - Toggle periode: Bulan ini / Tahun ini / Semua.
  - Klik irisan atau item legend membuka `/tickets?kategori=<bidang>`. Tambahkan dukungan query param ini di halaman tiket, tetap dibatasi oleh lingkup role.
- **Warna:**
  - P3: `#0066B3`
  - Pengadaan: `#00A6B6`
  - Pembayaran: `#00AAFF`
  - Lainnya: `#94A3B8`

**Kriteria selesai Fase 4:**
- [ ] Total di tengah donut sama dengan jumlah tiket pada periode yang dipilih.
- [ ] Mengganti periode memperbarui chart tanpa reload halaman.

---

## 7. Fase 5: Pengawasan tim untuk Kepala Departemen dan Kepala Bidang

### 7.1 Data
Buat `src/lib/teamOversight.ts` berisi `getTeamBacklog(user)`. Fungsi ini hanya boleh dipanggil jika `can(user, 'team:oversee')`.

- **Siapa yang termasuk "anggota tim":**
  - `KEPALA_BIDANG`: user yang `isAssignable`, `team === user.team`, dan `id !== user.id`.
  - `KEPALA_DEPARTEMEN`: semua user yang `isAssignable` kecuali dirinya sendiri, termasuk para Kepala Bidang. Hasilnya dikelompokkan per bidang.
- **Tiket yang dihitung:** `status IN ('OPEN','IN_PROGRESS')` dengan `picId` milik anggota tim.
- **Grup tambahan "Belum di-assign":** tiket dengan `picId = null` dan kategori sesuai bidang. Untuk Kepala Departemen, semua bidang.
- **Output per anggota:**
  - `name`, `initial`, `bidang`
  - `menunggu`, `diproses`
  - `lewatSla` (`slaDeadline < now`); boleh ditampilkan karena penggunanya internal Logistik
  - `tertua` (tanggal tiket terlama)
  - `tickets[]` berisi `{ id, ticketNumber, title, branch, status, createdAt, slaDeadline }`
- **Urutan:** `lewatSla` terbanyak dulu, lalu total terbanyak, lalu tiket tertua.
- **Ringkasan:** `{ totalTiket, totalAnggotaBermasalah, totalLewatSla, belumDiassign }`.

### 7.2 Section di dashboard: "Tiket tim yang belum selesai"
- Hanya tampil untuk role yang punya `team:oversee`. Letaknya di bawah KPI, di atas pie chart.
- Isinya tabel per anggota: nama, bidang (khusus Kepala Departemen), menunggu, diproses, lewat SLA (disorot), dan umur tiket tertua.
  - Baris bisa dibuka untuk melihat daftar tiketnya, dengan link ke `/tickets/[id]`.
  - Tombol "Ingatkan via Teams" memakai pola `teams.microsoft.com/l/chat/...` yang sudah ada.
- Kepala Departemen mendapat filter per bidang.
- **Kalau kosong:** tampilkan "Semua tiket tim sudah ditangani." Jangan sembunyikan section-nya.

### 7.3 Pop up setelah login
- **Pemicu:** pop up muncul **setiap kali login baru**, saat halaman dashboard pertama kali dimuat. Caranya:
  1. Server mengirim `sessionSid` (dari payload session Fase 1) dan ringkasan backlog ke `DashboardClient`.
  2. Client mengecek `localStorage['hl_team_digest_seen']`. Jika nilainya ≠ `sessionSid`, tampilkan pop up.
  3. Setelah pop up ditutup, simpan `sessionSid` ke key tersebut.
- **Tidak muncul** jika `totalTiket === 0`.
- **Isi pop up:**
  - Judul: "Tiket tim yang belum selesai".
  - Ringkasan angka: total tiket, anggota yang punya tiket terbuka, lewat SLA, belum di-assign.
  - Maksimal 8 baris anggota teratas (nama, jumlah, lewat SLA).
  - Tombol "Lihat semua di dashboard" (menutup pop up dan scroll ke section 7.2) dan tombol "Tutup".
- **Aksesibilitas:** `role="dialog"`, `aria-modal`, fokus masuk ke pop up saat dibuka dan dikembalikan saat ditutup, `Esc` menutup pop up.
- Tambahkan tombol kecil "Ringkasan tim" di header dashboard untuk membuka pop up lagi secara manual.
- Jangan tampilkan pop up di `/tv`.

**Kriteria selesai Fase 5:**
- [ ] Login sebagai Kepala Bidang: pop up hanya berisi anggota bidangnya, tanpa dirinya sendiri.
- [ ] Login sebagai Kepala Departemen: pop up berisi semua bidang, dikelompokkan per bidang.
- [ ] Logout lalu login lagi: pop up muncul lagi. Refresh halaman dalam session yang sama: pop up tidak muncul.
- [ ] PIC dan VIEWER: tidak ada pop up, tidak ada section tim, dan `getTeamBacklog` tidak pernah dipanggil.

---

## 8. Fase 6: Akun Pemantau (`VIEWER`)

- Akun ini dibuat oleh `user:manage` lewat `/users`. Contoh nama tampilan "Akun Pemantau", dengan inisial pendek non-personal (misalnya `VIEW`). **Jangan membuat akun ini lewat seed.**
- **Hanya bisa melihat:** dashboard (lingkup semua tiket), daftar tiket, detail tiket, reports tanpa export, dan Mode TV.
- **Karena aturan K1, data untuk VIEWER dibentuk di server tanpa field sensitif.** Buat helper DTO (misalnya `toTicketDTO(ticket, perms)`) yang menghapus:
  - `slaDeadline`, `priority`, persentase SLA
  - kontak PIC (`phone`, `email`)
  - `requesterEmail`
  
  Di dashboard VIEWER, kartu SLA, daftar "tiket kritis", dan tombol follow-up WA/Teams tidak dirender, dan datanya memang tidak dikirim.
- **UI yang tidak tampil untuk VIEWER:** tombol Buat Tiket, Edit, Hapus, Ubah Status, form komentar, menu Manajemen User, menu Ganti Password, dan tombol export.
- Tampilkan banner tipis di atas konten: "Anda masuk sebagai Akun Pemantau. Data hanya bisa dilihat."
- **VIEWER tidak dianggap orang:** tidak muncul di daftar PIC, leaderboard, beban kerja, milestone, maupun data pengawasan tim.
- **Semua API mutasi mengembalikan 403 untuk VIEWER.** Ini sudah tercakup oleh matriks di Fase 1; verifikasi ulang di fase ini.
- **Catatan operasional untuk Indra** (masukkan ke laporan, bukan ke kode): password akun bersama sebaiknya diganti berkala oleh Operator, dan akun ini cocok dipakai untuk perangkat TV kantor karena session-nya 7 hari.

**Kriteria selesai Fase 6:**
- [ ] Login VIEWER: payload RSC dashboard dan detail tiket tidak mengandung `slaDeadline`, `priority`, `phone`, maupun `requesterEmail`.
- [ ] `curl` dengan cookie VIEWER ke `POST /api/tickets`, `PATCH`/`DELETE /api/tickets/[id]`, `POST /api/users`, dan `/api/users/change-password` semuanya mendapat 403.
- [ ] VIEWER tidak muncul di dropdown PIC maupun di leaderboard TV.

---

## 9. Di luar lingkup blueprint ini (jangan dikerjakan kecuali diminta)
Bug berikut sudah diketahui dan akan dikerjakan terpisah. Catat saja jika kamu menemukannya.
- Logika SLA yang berbeda antara create (berdasarkan prioritas, hari kerja) dan edit (berdasarkan kategori, hari kalender).
- Field `priority` yang tidak tersimpan saat edit.
- Format tanggal di halaman lama yang belum memakai WIB.
- Race condition nomor tiket.
- Log "Re-assign" palsu.
- Kode mati: `/api/upload` tidak dipakai, begitu juga `tickets/[id]/resolve/route.ts` dan `lib/actions.ts`.
- Pembersihan `seed.ts` dan git history.

---

## 10. Checklist uji manual lintas role (jalankan setelah Fase 6)
Siapkan 5 akun uji di DB development, **bukan produksi**: satu per role. Kepala Bidang dan PIC dibuat di bidang yang sama.

| Skenario | OPR | KADEP | KABID | PIC | VIEWER |
|---|---|---|---|---|---|
| Lihat dashboard + pie bidang | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kartu SLA tampil | ✅ | ✅ | ✅ | ✅ | ❌ |
| Pop up tim saat login | ❌ | ✅ | ✅ | ❌ | ❌ |
| Section tim di dashboard | ❌ | ✅ | ✅ | ❌ | ❌ |
| Buat tiket | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit/hapus tiket bidang lain | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ubah status tiket sendiri | ✅ | ✅ | ✅ | ✅ | ❌ |
| Menu Manajemen User | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mode TV | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ganti password | ✅ | ✅ | ✅ | ✅ | ❌ |
