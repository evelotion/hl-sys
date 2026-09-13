-- Baseline migration untuk drift kolom User.password.
-- Kolom ini sudah ada di database (kemungkinan ditambahkan lewat `prisma db push` di masa lalu),
-- tapi tidak pernah tercatat di riwayat migration manapun. Migration ini HANYA mendaftarkan
-- perubahan itu ke riwayat Prisma Migrate secara resmi; TIDAK dijalankan dengan `migrate dev`
-- (yang akan mendeteksi drift dan menawarkan reset), melainkan didaftarkan sebagai "sudah
-- diterapkan" lewat `prisma migrate resolve --applied` setelah disetujui.
--
-- Dihasilkan dengan membandingkan state hasil rekonstruksi manual dari seluruh isi
-- prisma/migrations/*/migration.sql (dibaca satu per satu) terhadap prisma/schema.prisma saat ini,
-- lewat `prisma migrate diff --from-schema <rekonstruksi> --to-schema prisma/schema.prisma --script`.
-- Perbandingan ini murni antar-file, tidak menyentuh database, supaya tidak memicu deteksi drift
-- yang sama seperti `prisma migrate diff --from-migrations ...` (yang butuh shadow database).

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'password123';
