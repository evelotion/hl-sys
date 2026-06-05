// prisma/seed.ts
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Fungsi helper untuk menambah hari pada SLA
function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  console.log('🌱 Membersihkan data lama...')
  // Hapus tiket dulu baru user (karena tiket bergantung pada id user)
  await prisma.ticket.deleteMany()
  await prisma.user.deleteMany()

  console.log('⏳ Mulai seeding database user...')

  const usersData = [
    { initial: 'ABC', name: 'Andreanne B Christie', phone: '62818415996', email: 'andreanne_soetarman@bcasyariah.co.id', role: 'OPERATOR' },
    { initial: 'FER', name: 'Dian Ferdian', phone: '628567076858', email: 'dian_ferdian@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'NOV', name: 'Novianti Siswandi', phone: '6281385270839', email: 'novianti_siswandi@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'MAU', name: 'Maulina Ayu Arini', phone: '6285692876080', email: 'maulina_ayu@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'ASM', name: 'Anisa Salsabila M', phone: '6287726120957', email: 'anisa_salsabila@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'MLK', name: 'Malik Alfazari', phone: '6281226840858', email: 'malik_alfazari@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'IND', name: 'Indra Dwi Ananda', phone: '6285179677792', email: 'indra_dwi@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'RML', name: 'Rani Marlia Lubis', phone: '6281315339728', email: 'rani_marlia@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'GES', name: 'Ginanjar Eka Saputra', phone: '6287885463444', email: 'ginanjar_eka@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'RAP', name: 'Rangga Pradipta', phone: '6285731013115', email: 'rangga_pradipta@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'YNS', name: 'Yuni Setiawaty', phone: '628111972606', email: 'yuni_setiawaty@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'IDH', name: 'Intan Dwi Hidayati', phone: '6285719318563', email: 'intan_dwi@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'AND', name: 'Andhika Meviantama', phone: '6285884891328', email: 'andhika_meviantama@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'MWS', name: 'Marcus Williams', phone: '6289636583943', email: 'marcus_williams@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'HEN', name: 'Hendrik Burhan', phone: '6281286812227', email: 'hendrik_burhan@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'RIN', name: 'Kamirina', phone: '6281317737283', email: 'kamirina@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'RKS', name: 'Ruri Kartika Sari', phone: '6281311845273', email: 'ruri_kartika@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'ETK', name: 'Etik Fikria Zulfa', phone: '6281326393756', email: 'etik_fikria@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'RLY', name: 'Rully Bella Puspaningtyas', phone: '6281356505714', email: 'ruly_bella@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'IBL', name: 'Ikbal Kurnia', phone: '6281586048214', email: 'ikbal_kurnia@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'SML', name: 'Semuel Robert Lontoh', phone: '6285750337669', email: 'semuel_robert@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'ADM', name: 'ADMIN', phone: '6285179677792', email: 'admin_logistik@bcasyariah.co.id', role: 'OPERATOR' },
  ];

  await prisma.user.createMany({
    data: usersData as any,
    skipDuplicates: true,
  })

  console.log(`✅ ${usersData.length} user telah ditambahkan.`)
  
  console.log('⏳ Mulai seeding database tiket (10 Data dummy)...')

  // Ambil users dari database untuk mapping ID Relasi
  const dbUsers = await prisma.user.findMany();
  
  const picIND = dbUsers.find(u => u.initial === 'IND')?.id; // PIC P3
  const picFER = dbUsers.find(u => u.initial === 'FER')?.id; // PIC P3
  const picRAP = dbUsers.find(u => u.initial === 'RAP')?.id; // PIC Pengadaan
  const picGES = dbUsers.find(u => u.initial === 'GES')?.id; // PIC Pengadaan
  const picRIN = dbUsers.find(u => u.initial === 'RIN')?.id; // PIC Pembayaran

  const now = new Date();
  const pastDate = addDays(now, -2);
  const doneDate = addDays(now, -1);

  const ticketsData = [
    {
      ticketNumber: 'LOG-2026-0001',
      title: 'AC Ruang Server KCP Depok Menetes',
      description: 'Mohon bantuan untuk pengecekan dan perbaikan AC di ruang server karena meneteskan air ke area kabel.',
      category: 'P3',
      branchName: 'KCP DEPOK',
      requesterName: 'Budi Santoso',
      requesterEmail: 'budi_santoso@bcasyariah.co.id',
      mediaRequest: 'Lisan / Verbal',
      status: 'OPEN',
      requestDate: now,
      slaDeadline: addDays(now, 3),
      picId: picIND,
    },
    {
      ticketNumber: 'LOG-2026-0002',
      title: 'Pengadaan Laptop Staff Baru',
      description: 'Pengajuan pembelian 2 unit laptop standar untuk staff baru di cabang Jatinegara.',
      category: 'Pengadaan',
      branchName: 'KCP JATINEGARA',
      requesterName: 'Siti Aminah',
      requesterEmail: 'siti_aminah@bcasyariah.co.id',
      mediaRequest: 'Memo / Form Fisik',
      status: 'IN_PROGRESS',
      requestDate: pastDate,
      slaDeadline: addDays(pastDate, 14),
      picId: picRAP,
    },
    {
      ticketNumber: 'LOG-2026-0003',
      title: 'Pembayaran Vendor Service Lift',
      description: 'Mohon diproses pembayaran invoice PT Jaya Abadi untuk service lift bulan lalu.',
      category: 'Pembayaran',
      branchName: 'KANTOR PUSAT',
      requesterName: 'Rina Yuliana',
      requesterEmail: 'rina_yuliana@bcasyariah.co.id',
      mediaRequest: 'Email',
      status: 'DONE',
      requestDate: pastDate,
      slaDeadline: addDays(pastDate, 5),
      resolvedAt: doneDate,
      picId: picRIN,
    },
    {
      ticketNumber: 'LOG-2026-0004',
      title: 'Perbaikan Pintu Kaca KCP Bogor',
      description: 'Engsel pintu utama kaca cabang Bogor oblak dan susah ditutup, mohon bantuan tim pemeliharaan.',
      category: 'P3',
      branchName: 'KCP BOGOR',
      requesterName: 'Ahmad Fauzi',
      requesterEmail: 'ahmad_fauzi@bcasyariah.co.id',
      mediaRequest: 'Teams Form',
      status: 'IN_PROGRESS',
      requestDate: pastDate,
      slaDeadline: addDays(pastDate, 3),
      picId: picFER,
    },
    {
      ticketNumber: 'LOG-2026-0005',
      title: 'Pengadaan Kursi Tunggu Nasabah',
      description: 'Pengajuan 5 unit kursi tunggu tambahan untuk ruang layanan cabang Bekasi.',
      category: 'Pengadaan',
      branchName: 'KCP BEKASI',
      requesterName: 'Dewi Lestari',
      requesterEmail: 'dewi_lestari@bcasyariah.co.id',
      mediaRequest: 'Memo / Form Fisik',
      status: 'OPEN',
      requestDate: now,
      slaDeadline: addDays(now, 14),
      picId: picGES,
    },
    {
      ticketNumber: 'LOG-2026-0006',
      title: 'Perbaikan Lampu Signage Patah',
      description: 'Neon box BCA Syariah di depan cabang patah karena angin kencang.',
      category: 'P3',
      branchName: 'KCP CIKARANG',
      requesterName: 'Tono Hermawan',
      requesterEmail: 'tono_hermawan@bcasyariah.co.id',
      mediaRequest: 'Lisan / Verbal',
      status: 'OPEN',
      requestDate: now,
      slaDeadline: addDays(now, 3),
      picId: picIND,
    },
    {
      ticketNumber: 'LOG-2026-0007',
      title: 'Pembayaran Tagihan Listrik KCP',
      description: 'Mohon dibayarkan segera tagihan listrik untuk KCP Tangerang sebelum denda.',
      category: 'Pembayaran',
      branchName: 'KCP TANGERANG',
      requesterName: 'Sinta',
      requesterEmail: 'sinta@bcasyariah.co.id',
      mediaRequest: 'Email',
      status: 'IN_PROGRESS',
      requestDate: pastDate,
      slaDeadline: addDays(pastDate, 5),
      picId: picRIN,
    },
    {
      ticketNumber: 'LOG-2026-0008',
      title: 'Perbaikan Mesin Antrean',
      description: 'Mesin cetak nomor antrean macet dan kertas tidak keluar.',
      category: 'P3',
      branchName: 'KCP MARGONDA',
      requesterName: 'Ferry',
      requesterEmail: 'ferry@bcasyariah.co.id',
      mediaRequest: 'Teams Form',
      status: 'DONE',
      requestDate: pastDate,
      slaDeadline: addDays(pastDate, 3),
      resolvedAt: doneDate,
      picId: picFER,
    },
    {
      ticketNumber: 'LOG-2026-0009',
      title: 'Pengadaan ATK Bulanan',
      description: 'Pengadaan rutin kertas A4, tinta printer, dan pulpen untuk operasional bulanan.',
      category: 'Pengadaan',
      branchName: 'KANTOR PUSAT',
      requesterName: 'Dina',
      requesterEmail: 'dina@bcasyariah.co.id',
      mediaRequest: 'Memo / Form Fisik',
      status: 'DONE',
      requestDate: pastDate,
      slaDeadline: addDays(pastDate, 14),
      resolvedAt: doneDate,
      picId: picRAP,
    },
    {
      ticketNumber: 'LOG-2026-0010',
      title: 'Pembayaran Maintenance CCTV',
      description: 'Invoice maintenance CCTV cabang bulan ini.',
      category: 'Pembayaran',
      branchName: 'KCP KELAPA GADING',
      requesterName: 'Joko',
      requesterEmail: 'joko@bcasyariah.co.id',
      mediaRequest: 'Email',
      status: 'OPEN',
      requestDate: now,
      slaDeadline: addDays(now, 5),
      picId: picRIN,
    }
  ];

  await prisma.ticket.createMany({
    data: ticketsData as any,
    skipDuplicates: true,
  });

  console.log(`✅ Seeding selesai! ${ticketsData.length} tiket telah ditambahkan.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })