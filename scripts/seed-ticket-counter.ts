// scripts/seed-ticket-counter.ts
//
// Mengisi TicketCounter.lastNumber per tahun dari nomor tiket tertinggi yang sudah ada di
// tabel Ticket, supaya nomor tiket baru (Fase 3 Blueprint v3, lihat src/app/api/tickets/
// route.ts) melanjutkan urutan lama alih-alih mulai dari 0001 dan bertabrakan.
//
// Default: DRY-RUN. Hanya mencetak rencana per tahun, tidak menulis apa pun. Menulis ke DB
// hanya dengan flag --apply. Aman dijalankan berkali-kali: TIDAK PERNAH menurunkan
// lastNumber yang sudah ada di DB -- kalau counter untuk suatu tahun sudah >= hasil hitung,
// tahun itu dilewati.
//
// ticketNumber yang formatnya TIDAK cocok pola persis "LOG-<4 digit tahun>-<4 digit urut>"
// dilaporkan (jumlah + contoh), bukan diam-diam diabaikan dari perhitungan.
//
// WAJIB dijalankan segera setelah migration `add_ticket_counter` diterapkan dan SEBELUM
// kode yang memakai TicketCounter di-deploy -- lihat docs/RELEASE-NOTES.md.
//
// Jalankan: npx tsx scripts/seed-ticket-counter.ts [--apply]

import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TICKET_NUMBER_PATTERN = /^LOG-(\d{4})-(\d{4})$/;

async function main() {
  const apply = process.argv.includes('--apply');

  const tickets = await prisma.ticket.findMany({ select: { ticketNumber: true } });

  const maxByYear = new Map<number, number>();
  const malformed: string[] = [];

  for (const t of tickets) {
    const match = t.ticketNumber.match(TICKET_NUMBER_PATTERN);
    if (!match) {
      malformed.push(t.ticketNumber);
      continue;
    }
    const year = Number(match[1]);
    const seq = Number(match[2]);
    const current = maxByYear.get(year) ?? 0;
    if (seq > current) maxByYear.set(year, seq);
  }

  const years = [...maxByYear.keys()].sort((a, b) => a - b);
  const existingCounters = await prisma.ticketCounter.findMany();
  const existingByYear = new Map(existingCounters.map((c) => [c.year, c.lastNumber]));

  console.log(apply ? '🚀 MODE APPLY -- akan menulis ke database' : '🔎 MODE DRY-RUN -- tidak ada yang ditulis');
  console.log(`Total tiket di DB: ${tickets.length}`);
  console.log('');

  if (malformed.length > 0) {
    console.log(`⚠️  ${malformed.length} ticketNumber TIDAK cocok pola "LOG-<tahun>-<4 digit>" -- DILEWATI dari perhitungan (bukan dianggap 0):`);
    for (const ex of malformed.slice(0, 10)) console.log(`  - ${ex}`);
    if (malformed.length > 10) console.log(`  ... dan ${malformed.length - 10} lainnya`);
    console.log('');
  } else {
    console.log('Semua ticketNumber cocok pola "LOG-<tahun>-<4 digit>".');
    console.log('');
  }

  console.log(`Tahun yang ditemukan di data tiket: ${years.length === 0 ? '(tidak ada)' : years.join(', ')}`);
  console.log('');
  console.log('Rencana per tahun:');

  const toWrite: { year: number; lastNumber: number }[] = [];

  for (const year of years) {
    const highestExisting = maxByYear.get(year)!;
    const currentCounter = existingByYear.get(year);

    if (currentCounter === undefined) {
      console.log(`  ${year}: nomor tiket tertinggi ${String(highestExisting).padStart(4, '0')}, belum ada baris TicketCounter -> akan dibuat dengan lastNumber=${highestExisting}`);
      toWrite.push({ year, lastNumber: highestExisting });
    } else if (currentCounter < highestExisting) {
      console.log(`  ${year}: nomor tiket tertinggi ${String(highestExisting).padStart(4, '0')}, TicketCounter sekarang lastNumber=${currentCounter} -> akan dinaikkan ke ${highestExisting}`);
      toWrite.push({ year, lastNumber: highestExisting });
    } else {
      console.log(`  ${year}: nomor tiket tertinggi ${String(highestExisting).padStart(4, '0')}, TicketCounter sekarang lastNumber=${currentCounter} -> sudah cukup, DILEWATI (tidak pernah diturunkan)`);
    }
  }

  if (!apply) {
    console.log('');
    console.log('Ini baru dry-run. Jalankan ulang dengan --apply untuk benar-benar menulis ke database.');
    return;
  }

  console.log('');
  for (const w of toWrite) {
    await prisma.ticketCounter.upsert({
      where: { year: w.year },
      create: { year: w.year, lastNumber: w.lastNumber },
      update: { lastNumber: w.lastNumber },
    });
  }
  console.log(`✅ ${toWrite.length} baris TicketCounter ditulis/diperbarui.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
