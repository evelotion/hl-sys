import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Setup koneksi adapter khusus untuk proses seed
const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Mulai seeding database...')

  // 1. Buat User (Hanya PIC Logistik sesuai schema baru)
  const picNovi = await prisma.user.create({
    data: { name: 'Novianti Siswandi', role: 'PIC_LOGISTIK' }
  })
  const picIkbal = await prisma.user.create({
    data: { name: 'Ikbal Kurnia', role: 'PIC_LOGISTIK' }
  })
  const picMalik = await prisma.user.create({
    data: { name: 'Malik Alfazari', role: 'PIC_LOGISTIK' }
  })

  // 2. Buat Dummy Ticket (Pakai branchName, bukan cabangId)
  await prisma.ticket.create({
    data: {
      ticketNumber: 'LOG-2026-0001',
      title: 'AC Server Room KP Mati',
      description: 'AC di ruang server utama mati sejak semalam. Suhu ruangan sudah mencapai 28 derajat celcius. Mohon segera dilakukan pengecekan.',
      category: 'Perbaikan Fasilitas',
      status: 'OPEN',
      branchName: 'Kantor Pusat', // <-- Penyesuaian ke skema baru
      picId: picNovi.id,
    }
  })

  await prisma.ticket.create({
    data: {
      ticketNumber: 'LOG-2026-0002',
      title: 'Pengadaan ATK Bulanan',
      description: 'Kertas HVS A4 10 Rim, Tinta Printer Epson 4 botol, dan Pulpen 2 Box.',
      category: 'Permintaan ATK',
      status: 'IN_PROGRESS',
      branchName: 'Cabang Bekasi', // <-- Penyesuaian ke skema baru
      picId: picIkbal.id,
    }
  })

  await prisma.ticket.create({
    data: {
      ticketNumber: 'LOG-2026-0003',
      title: 'Perbaikan Handle Pintu Kaca',
      description: 'Handle pintu masuk utama lepas dan bautnya hilang.',
      category: 'Perbaikan Fasilitas',
      status: 'DONE',
      branchName: 'Cabang Depok', // <-- Penyesuaian ke skema baru
      picId: picMalik.id,
      resolvedAt: new Date()
    }
  })

  console.log('✅ Seeding selesai! Database udah terisi.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })