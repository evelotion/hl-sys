// prisma/seed.ts
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Membersihkan data lama...')
  await prisma.ticket.deleteMany()
  await prisma.user.deleteMany()

  console.log('⏳ Mulai seeding database user...')

  const usersData = [
    { initial: 'ABC', name: 'Andreanne B Christie', phone: '62818415996', role: 'PIC_LOGISTIK' },
    { initial: 'FER', name: 'Dian Ferdian', phone: '628567076858', role: 'PIC_LOGISTIK' },
    { initial: 'NOV', name: 'Novianti Siswandi', phone: '6281385270839', role: 'PIC_LOGISTIK' },
    { initial: 'MAU', name: 'Maulina Ayu Arini', phone: '6285692876080', role: 'PIC_LOGISTIK' },
    { initial: 'ASM', name: 'Anisa Salsabila M', phone: '6287726120957', role: 'PIC_LOGISTIK' },
    { initial: 'MLK', name: 'Malik Alfazari', phone: '6281226840858', role: 'PIC_LOGISTIK' },
    { initial: 'IND', name: 'Indra Dwi Ananda', phone: '6285179677792', role: 'PIC_LOGISTIK' },
    { initial: 'RML', name: 'Rani Marlia Lubis', phone: '6281315339728', role: 'PIC_LOGISTIK' },
    { initial: 'GES', name: 'Ginanjar Eka Saputra', phone: '6287885463444', role: 'PIC_LOGISTIK' },
    { initial: 'RAP', name: 'Rangga Pradipta', phone: '6285731013115', role: 'PIC_LOGISTIK' },
    { initial: 'YNS', name: 'Yuni Setiawaty', phone: '628111972606', role: 'PIC_LOGISTIK' },
    { initial: 'IDH', name: 'Intan Dwi Hidayati', phone: '6285719318563', role: 'PIC_LOGISTIK' },
    { initial: 'AND', name: 'Andhika Meviantama', phone: '6285884891328', role: 'PIC_LOGISTIK' },
    { initial: 'MWS', name: 'Marcus Williams', phone: '6289636583943', role: 'PIC_LOGISTIK' },
    { initial: 'HEN', name: 'Hendrik Burhan', phone: '6281286812227', role: 'PIC_LOGISTIK' },
    { initial: 'RIN', name: 'Kamerina', phone: '6281317737283', role: 'PIC_LOGISTIK' },
    { initial: 'RKS', name: 'Ruri Kartika Sari', phone: '6281311845273', role: 'PIC_LOGISTIK' },
    { initial: 'ETK', name: 'Etik Fikria Zulfa', phone: '6281326393756', role: 'PIC_LOGISTIK' },
    { initial: 'RLY', name: 'Rully Bella Puspaningtyas', phone: '6281356505714', role: 'PIC_LOGISTIK' },
    { initial: 'IBL', name: 'Ikbal Kurnia', phone: '6281586048214', role: 'PIC_LOGISTIK' },
    { initial: 'SML', name: 'Semuel Robert Lontoh', phone: '6285750337669', role: 'PIC_LOGISTIK' },
    { initial: 'ADM', name: 'ADMIN', phone: '6285179677792', role: 'OPERATOR' }, // Hanya ini yang bisa bikin tiket
  ];

  // Gunakan type assertion agar sesuai dengan enum Role di Prisma
  await prisma.user.createMany({
    data: usersData as any,
    skipDuplicates: true,
  })

  console.log(`✅ Seeding selesai! ${usersData.length} user telah ditambahkan.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })