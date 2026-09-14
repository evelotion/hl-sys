# Addendum: Perubahan Mode TV (permintaan pimpinan)

Dokumen ini untuk Claude Code. Isinya perubahan terhadap Mode TV yang sudah selesai dikerjakan di Blueprint v2 Fase 2 (commit `6c71bb3`).

Kerjakan setelah blueprint v3 selesai, **atau** dahulukan kalau Indra minta begitu. Ini pekerjaan yang berdiri sendiri dan tidak bergantung pada v3.

---

## 0. Ringkasan perubahan

1. Slide **"Staf terbanyak menyelesaikan tiket" dihapus**, diganti slide **"Tiket terlama"**.
2. Kolom Perihal **tidak boleh terpotong** — tampil sampai 2 baris.
3. Jumlah tiket per slide **dikurangi dari 8 menjadi 5**.

Aturan keras dari blueprint v2 tetap berlaku sepenuhnya: **tidak ada data SLA, prioritas, nomor HP, atau email yang boleh dikirim ke `/api/tv`**, karena Mode TV bisa dilihat orang di luar Departemen Logistik.

---

## 1. Slide baru: Tiket terlama

### 1.1 Definisi
"Terlama" berarti **tiket yang paling lama belum selesai**, bukan tiket tertua secara keseluruhan. Kalau diurutkan tanpa filter status, isinya akan didominasi tiket lama yang sudah lama selesai, dan itu tidak berguna.

- Ambil tiket dengan `status IN ('OPEN', 'IN_PROGRESS')`
- Urutkan `createdAt` menaik (paling tua di atas)
- Ambil 5 teratas

### 1.2 Kolom yang ditampilkan
Sama seperti slide Tiket terbaru, dengan satu perbedaan: kolom pertama berisi **umur tiket**, bukan jam masuk.

| Kolom | Isi |
|---|---|
| Umur | Jumlah hari sejak `createdAt`, dihitung dalam WIB. Format: `23 hari`. Kalau 0, tulis `Hari ini` |
| No. tiket | `ticketNumber` |
| Perihal | `title`, sampai 2 baris |
| Cabang / unit | `branch` (sudah dinormalisasi) |
| PIC | `picName`, atau "Belum ditentukan" |
| Status | pil status yang sudah ada |

Umur dihitung dari selisih `wibDayKey`, bukan selisih milidetik dibagi 86400000, supaya tidak meleset karena jam.

### 1.3 Judul dan subjudul slide
- Judul: **"Tiket terlama belum selesai"**
- Subjudul: "5 tiket yang paling lama menunggu penyelesaian"

### 1.4 Kalau kosong
Kalau tidak ada tiket berstatus OPEN atau IN_PROGRESS sama sekali, tampilkan pesan positif: "Tidak ada tiket yang menunggu penyelesaian." Jangan lewati slide-nya — slide tetap tampil dengan pesan itu.

---

## 2. Hapus slide Staf terbaik

- Hapus `SlideStaf` beserta entri `staf` di konstanta `SLIDES` dan di daftar urutan slide.
- Hapus juga field `staff` dari `TvData` dan query `groupBy` yang membangunnya di `getTvData`, supaya tidak ada data yang dihitung percuma.
- **Jangan hapus `milestones` dan slide Apresiasi.** Keduanya berdiri sendiri, dihitung dari total tiket selesai per orang, bukan dari leaderboard. Slide Apresiasi tetap ada sesuai permintaan awal pimpinan.
- Komponen `Avatar` masih dipakai slide Apresiasi, jadi jangan ikut dihapus.

### Urutan slide setelah perubahan
1. Ringkasan tiket (20 detik)
2. Cabang & unit kerja teraktif (15 detik)
3. Tiket terbaru (15 detik)
4. Tiket terlama belum selesai (15 detik)
5. Apresiasi pencapaian (15 detik) — hanya muncul kalau ada milestone

---

## 3. Perihal 2 baris dan 5 baris tiket

Berlaku untuk **kedua** slide tiket (terbaru dan terlama).

### 3.1 Jumlah baris
Ubah `TV_CONFIG.latestCount` dari 8 menjadi 5, dan pakai angka yang sama untuk slide tiket terlama (boleh satu konstanta yang dipakai berdua, misalnya `ticketRows: 5`).

### 3.2 Perihal tidak terpotong
Sekarang kolom Perihal memakai `truncate` (satu baris, dipotong elipsis). Ganti supaya:
- Teks membungkus sampai **maksimal 2 baris**, dengan `line-clamp-2`
- Tinggi baris tabel dinaikkan supaya 2 baris muat tanpa terpotong vertikal

### 3.3 Penyesuaian layout
Kanvas tetap 1920×1080, dan area konten tetap `top: 204, bottom: 128` (tinggi efektif 748 px). Dengan 5 baris, ruang per baris jauh lebih lega daripada sebelumnya.

Sesuaikan sendiri angkanya, dengan panduan:
- Tinggi baris sekitar 120–130 px, cukup untuk 2 baris teks Perihal
- Kolom Perihal dilebarkan, karena kolom Umur lebih sempit daripada kolom jam
- Ukuran font Perihal boleh tetap 30 px, atau turun sedikit kalau perlu — jangan di bawah 26 px, karena harus terbaca dari jarak orang duduk di ruangan
- Baris tabel dan teks di dalamnya rata atas (`align-top`), bukan rata tengah, supaya baris dengan judul 1 baris dan 2 baris tetap sejajar rapi
- **Total tinggi tidak boleh melebihi area konten.** Hitung dulu sebelum menulis kode, dan sebutkan hasil hitunganmu di laporan

### 3.4 Judul yang sangat panjang
Kalau ada judul yang tetap tidak muat dalam 2 baris, elipsis di akhir baris kedua masih boleh. Yang dihindari adalah pemotongan di tengah baris pertama seperti sekarang.

---

## 4. Hal yang tidak berubah

Jangan sentuh bagian-bagian ini:
- Polling 30 detik, banner tiket baru, indikator koneksi, overlay sesi berakhir
- Wake lock, kontrol keyboard, tombol kontrol yang sembunyi otomatis
- Slide Ringkasan, Cabang, dan Apresiasi
- Palet warna dan tipografi
- Guard `requirePermission('tv:view')` dan aturan data sensitif

---

## 5. Kriteria selesai

- [ ] `grep -io "sla\|priority\|phone\|email"` terhadap response `/api/tv` yang sungguhan → nihil (kecuali substring dalam judul tiket seperti "Microphone", yang harus dicek konteksnya dan dilaporkan)
- [ ] Slide Staf terbaik tidak ada lagi, dan field `staff` hilang dari response `/api/tv`
- [ ] Slide Apresiasi masih berfungsi
- [ ] Slide Tiket terlama hanya berisi tiket OPEN dan IN_PROGRESS, terurut dari yang paling tua
- [ ] Umur tiket dihitung dalam WIB, dan benar ketika diuji antara pukul 00.00–07.00 WIB
- [ ] Kedua slide tiket menampilkan 5 baris, dengan Perihal sampai 2 baris
- [ ] `npx tsc --noEmit` dan `npx eslint .` bersih
- [ ] Sebutkan di laporan: hitungan tinggi total tabel, dan judul terpanjang di DB dev beserta apakah muat dalam 2 baris

Jangan commit sebelum Indra review. Indra akan memeriksa tampilannya langsung di browser, karena ini perubahan visual yang tidak bisa diverifikasi lewat grep.
