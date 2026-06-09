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
    { initial: 'SEM', name: 'Semuel Robert Lontoh', phone: '6285750337669', email: 'semuel_robert@bcasyariah.co.id', role: 'PIC_LOGISTIK' },
    { initial: 'ADM', name: 'ADMIN', phone: '6285179677792', email: 'admin_logistik@bcasyariah.co.id', role: 'OPERATOR' },
  ];

  await prisma.user.createMany({
    data: usersData as any,
    skipDuplicates: true,
  })

  console.log(`✅ ${usersData.length} user telah ditambahkan.`)
  
  // TIKET DUMMY SUDAH DIHAPUS DARI SINI
  console.log('✅ Seeding selesai! Database bersih dari tiket dummy. Siap dimulai dari nomor 1.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })