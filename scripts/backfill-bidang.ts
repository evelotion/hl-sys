// scripts/backfill-bidang.ts
//
// Mengisi User.team berdasarkan pemetaan inisial -> bidang yang sebelumnya hardcoded
// (p3Initials/pembayaranInitials/pengadaanInitials) di src/app/(dashboard)/page.tsx,
// tickets/[id]/TaskViewClient.tsx, dan tickets/create/CreateTicketClient.tsx, sebelum
// ketiganya diganti membaca User.team langsung (Fase 3, docs/BLUEPRINT-hl-sys-v2.md bagian 5).
//
// Default: DRY-RUN. Hanya mencetak jumlah perubahan per bidang (tanpa nama), dan daftar
// inisial yang tidak ada di pemetaan. Menulis ke DB hanya dengan flag --apply.
// Hanya mengisi user yang team-nya masih 'Lainnya' -- tidak pernah menimpa nilai yang
// sudah diisi manual.
//
// Jalankan: npx tsx scripts/backfill-bidang.ts [--apply]

import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { BIDANG, type BidangName } from '../src/lib/roles';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Pemetaan asli, disalin persis dari ketiga file hardcoded di atas sebelum dihapus.
const P3_INITIALS = ['FER', 'MAU', 'ASM', 'MLK', 'NOV', 'IND', 'SML', 'IBL', 'SEM'];
const PEMBAYARAN_INITIALS = ['RIN', 'ETK', 'RKS'];
const PENGADAAN_INITIALS = ['GES', 'RAP', 'YNS', 'AND', 'IDH', 'RML', 'HEN', 'MWS'];

const INITIAL_TO_BIDANG = new Map<string, BidangName>();
for (const initial of P3_INITIALS) INITIAL_TO_BIDANG.set(initial, BIDANG.P3);
for (const initial of PEMBAYARAN_INITIALS) INITIAL_TO_BIDANG.set(initial, BIDANG.PEMBAYARAN);
for (const initial of PENGADAAN_INITIALS) INITIAL_TO_BIDANG.set(initial, BIDANG.PENGADAAN);

async function main() {
  const apply = process.argv.includes('--apply');

  const candidates = await prisma.user.findMany({
    where: { team: BIDANG.LAINNYA },
    select: { id: true, initial: true },
  });

  const toUpdate: { id: string; initial: string; bidang: BidangName }[] = [];
  const unmapped: string[] = [];

  for (const user of candidates) {
    const bidang = INITIAL_TO_BIDANG.get(user.initial);
    if (bidang) {
      toUpdate.push({ id: user.id, initial: user.initial, bidang });
    } else {
      unmapped.push(user.initial);
    }
  }

  const countsByBidang: Record<string, number> = {};
  const initialsByBidang: Record<string, string[]> = {};
  for (const u of toUpdate) {
    countsByBidang[u.bidang] = (countsByBidang[u.bidang] || 0) + 1;
    (initialsByBidang[u.bidang] ||= []).push(u.initial);
  }

  console.log(apply ? '🚀 MODE APPLY -- akan menulis ke database' : '🔎 MODE DRY-RUN -- tidak ada yang ditulis');
  console.log(`Total user dengan team='Lainnya' saat ini: ${candidates.length}`);
  console.log('');
  console.log('Rencana perubahan per bidang:');
  if (toUpdate.length === 0) {
    console.log('  (tidak ada user yang cocok dengan pemetaan)');
  } else {
    for (const [bidang, count] of Object.entries(countsByBidang)) {
      console.log(`  ${bidang}: ${count} user -> ${initialsByBidang[bidang].join(', ')}`);
    }
  }
  console.log('');
  console.log(`Inisial dengan team='Lainnya' TIDAK ADA di pemetaan (perlu diisi manual): ${unmapped.length}`);
  if (unmapped.length > 0) {
    console.log(`  ${unmapped.join(', ')}`);
  }

  if (!apply) {
    console.log('');
    console.log('Ini baru dry-run. Jalankan ulang dengan --apply untuk benar-benar menulis ke database.');
    return;
  }

  console.log('');
  for (const u of toUpdate) {
    await prisma.user.update({ where: { id: u.id }, data: { team: u.bidang } });
  }
  console.log(`✅ ${toUpdate.length} user telah diperbarui.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
