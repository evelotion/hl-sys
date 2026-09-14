# Panduan Deploy hl-sys ke Produksi

Dokumen ini untuk **Indra**, bukan untuk Claude Code. Jangan serahkan langkah-langkah di sini ke Claude Code — beberapa di antaranya menyentuh database produksi dan harus dikerjakan oleh manusia yang tahu konteksnya.

Deploy ini membawa perubahan besar: seluruh pengguna akan logout sekali, dan password `password123` tidak lagi berlaku untuk semua orang.

---

## Sebelum hari H

### Syarat yang harus sudah beres
- [ ] Blueprint v3 (perbaikan bug) selesai dan sudah di-commit
- [ ] `docs/CLEANUP-HISTORY.md` sudah dijalankan, `prisma/seed.ts` bersih dari riwayat git
- [ ] Semua commit sudah di-push ke GitHub
- [ ] `npm run build` sukses dari kondisi bersih

### Pilih waktunya
Di luar jam kerja. Sore setelah jam pulang, atau akhir pekan. Sediakan waktu 1 jam, walaupun kemungkinan hanya butuh 20 menit.

Antara Langkah 4 dan Langkah 7, aplikasi berada dalam kondisi setengah jadi. Jangan berhenti di tengah.

### Umumkan ke tim
Kirim minimal sehari sebelumnya. Draft ada di bagian akhir dokumen ini.

### Cek siapa yang pernah ganti password
Di Neon SQL Editor, **pilih branch `main`**:

```sql
SELECT initial, name,
       CASE WHEN password = 'password123' THEN 'default' ELSE 'sudah diganti' END AS status
FROM "User" ORDER BY initial;
```

Query ini tidak menampilkan password aslinya. Yang statusnya "sudah diganti" harus ingat password mereka sendiri setelah deploy. Hubungi mereka lebih dulu.

Catat juga: setelah deploy, kamu bisa mereset password siapa pun lewat tombol kunci di `/users`.

---

## Hari H

### Langkah 1 — Cadangkan database

Di Neon Console: **Branches → Create branch**.
- Name: `backup-sebelum-deploy-v2`
- From: `main`
- Include: semua data sampai saat ini
- Create compute endpoint: **uncheck**

Ini titik pulih kamu. Jangan lewati.

**Cek:** branch baru muncul di daftar.

---

### Langkah 2 — Siapkan connection string produksi

Di Neon Console, buka branch `main` → **Connection Details** → ambil **direct connection**, yang hostname-nya **tidak** mengandung `-pooler`.

Prisma Migrate memakai advisory lock, dan itu bermasalah lewat connection pooler.

Buka `.env`, **catat dulu nilai `DATABASE_URL` yang sekarang** (punya branch `dev`) di tempat aman, lalu ganti sementara dengan connection string produksi.

**Cek:**
```powershell
npx prisma migrate status
```
Harus menyebut endpoint produksi, dan melaporkan ada migration yang belum diterapkan.

---

### Langkah 3 — Tandai baseline drift

Migration ini menambahkan kolom `password` yang **sudah ada** di produksi. Karena itu jangan dijalankan, cukup ditandai sudah diterapkan.

```powershell
npx prisma migrate resolve --applied 20260913082730_baseline_user_password_drift
```

**Cek:**
```powershell
npx prisma migrate status
```
Migration baseline sudah tidak muncul sebagai pending.

> **Kalau muncul tawaran reset database, jawab tidak.** Hentikan proses dan minta bantuan.

---

### Langkah 4 — Terapkan migration

```powershell
npx prisma migrate deploy
```

**Mulai dari titik ini semua pengguna langsung logout**, karena kolom `sessionsValidFrom` diisi waktu sekarang untuk semua baris.

**Cek:**
```powershell
npx prisma migrate status
```
Harus menyebut "Database schema is up to date!".

---

### Langkah 5 — Pastikan SESSION_SECRET ada di Vercel

Vercel → project hl-sys → **Settings → Environment Variables**.

Pastikan `SESSION_SECRET` ada untuk environment Production. Kalau belum, buat nilai baru:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Nilainya boleh berbeda dari yang di lokal. Yang penting **ada** dan **tidak pernah berubah setelah ini**, karena mengubahnya membuat semua orang logout lagi.

Pastikan juga `DATABASE_URL` di Vercel menunjuk ke `main`. Untuk aplikasi yang berjalan, connection string pooler justru yang dianjurkan — beda dengan migration.

**Cek:** kedua variabel terdaftar untuk Production.

---

### Langkah 6 — Deploy kode

```powershell
git push
```

Vercel akan otomatis build. Tunggu sampai statusnya Ready.

**Cek:** log build tidak ada error, dan deployment terbaru berstatus Ready.

> **Kalau build gagal:** produksi masih memakai versi lama, jadi aplikasi tetap hidup. Tapi database sudah versi baru, jadi tulis ke tabel User akan gagal. Perbaiki build-nya secepatnya, atau lanjutkan ke bagian Kalau Harus Mundur.

---

### Langkah 7 — Backfill bidang

**Ini wajib.** Tanpa ini, semua user bertim `Lainnya` dan dropdown PIC kosong untuk P3, Pengadaan, dan Pembayaran — artinya tidak ada yang bisa membuat tiket.

`.env` masih menunjuk produksi dari Langkah 2. Jalankan dry-run dulu:

```powershell
npx tsx scripts/backfill-bidang.ts
```

Periksa daftarnya. Harus mirip dengan yang di dev: 8 P3, 8 Pengadaan, 3 Pembayaran. Kalau muncul inisial asing atau jumlahnya jauh berbeda, **berhenti dan periksa dulu**.

Kalau sudah cocok:

```powershell
npx tsx scripts/backfill-bidang.ts --apply
```

**Cek** di Neon SQL Editor, branch `main`:
```sql
SELECT team, COUNT(*) FROM "User" GROUP BY team;
```
Harus muncul P3, Pengadaan, Pembayaran, dan sisa `Lainnya` untuk akun yang memang tidak berbidang.

---

### Langkah 8 — Seed counter nomor tiket

Hanya kalau Fase 3 blueprint v3 sudah dikerjakan. Jalankan script seed counter dengan dry-run dulu, lalu `--apply`.

**Cek:** nomor counter sama dengan nomor tiket tertinggi yang ada.

---

### Langkah 9 — Kembalikan `.env` ke dev

**Jangan lewati ini.** Kalau lupa, semua pekerjaan Claude Code berikutnya akan menyentuh produksi.

Buka `.env`, kembalikan `DATABASE_URL` ke connection string branch `dev` yang kamu catat di Langkah 2.

**Cek:**
```powershell
npx prisma migrate status
```
Harus menyebut endpoint dev, bukan produksi.

---

### Langkah 10 — Uji di produksi

Buka aplikasi produksi di browser:

- [ ] Login dengan akun kamu sendiri
- [ ] Dashboard tampil, angka-angkanya masuk akal
- [ ] Jam yang tampil sesuai WIB
- [ ] Buka `/tickets`, daftar tiket muncul
- [ ] Buka satu tiket, detailnya lengkap
- [ ] Buat tiket uji: dropdown PIC terisi untuk kategori P3 — **ini yang paling penting**, karena membuktikan backfill berhasil
- [ ] Hapus tiket uji itu
- [ ] Klik Mode TV, tampil layar penuh
- [ ] Buka `/users`, daftar user muncul dengan role dan bidangnya

Lalu minta satu rekan mencoba login, untuk memastikan orang lain juga bisa masuk.

---

## Kalau harus mundur

### Kode bermasalah, database baik-baik saja
Di Vercel → Deployments → pilih deployment lama yang berfungsi → **Promote to Production**. Tapi ingat: database sudah punya kolom baru, dan kode lama tidak tahu soal itu. Ini hanya solusi sementara sambil memperbaiki.

### Database bermasalah
Neon Console → Branches → `main` → **Restore**, pilih waktu sebelum Langkah 4. Atau pakai branch `backup-sebelum-deploy-v2` dari Langkah 1.

**Restore menimpa kondisi saat ini**, dan semua perubahan setelah titik itu hilang. Kalau sudah ada tiket baru masuk setelah deploy, tiket itu akan ikut hilang. Pertimbangkan dulu.

### Semua orang tidak bisa login
Kemungkinan besar `SESSION_SECRET` belum ada atau salah di Vercel. Periksa Langkah 5. Perbaiki nilainya, lalu redeploy.

---

## Draft pengumuman untuk tim

> **Pemberitahuan: Pembaruan Sistem Hotline Logistik**
>
> Halo rekan-rekan,
>
> Aplikasi HL-SYS akan diperbarui pada [hari, tanggal] sekitar pukul [jam]. Prosesnya sekitar 30 menit, dan selama itu aplikasi mungkin tidak bisa diakses.
>
> **Yang berubah untuk Anda:**
>
> **1. Semua orang perlu login ulang.** Ini normal dan hanya sekali.
>
> **2. Password Anda sekarang benar-benar diperiksa.** Sebelumnya sistem menerima `password123` untuk semua akun. Setelah pembaruan:
> - Kalau Anda belum pernah mengganti password, tetap pakai `password123`
> - Kalau Anda pernah menggantinya, pakai password yang Anda buat sendiri
> - Lupa? Hubungi saya untuk direset
>
> Mohon segera ganti password default Anda lewat menu Ganti Password.
>
> **3. Tampilan dashboard bertambah.** Ada grafik distribusi tiket per bidang, dan untuk Kepala Bidang serta Kepala Departemen ada ringkasan tiket tim yang belum selesai.
>
> **4. Ada Mode TV** untuk ditayangkan di layar kantor.
>
> Kalau ada kendala setelah pembaruan, silakan hubungi saya.
>
> Terima kasih,
> Indra

---

## Setelah deploy

Dalam beberapa hari pertama:
- Pantau siapa saja yang kesulitan login, dan bantu reset password
- Periksa apakah ada tiket yang nomornya gagal terbentuk
- Pastikan SLA tiket baru terhitung benar
- Isi `src/lib/holidays.ts` dengan tanggal libur nasional tahun ini kalau belum

Yang masih tertunda dan perlu ditangani nanti:
- Rate limit login belum efektif di Vercel
- Reset password belum tercatat di activity log permanen
- Angka SLA masih sementara, menunggu surat ketentuan resmi
