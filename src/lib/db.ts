import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // Inisialisasi pool koneksi Neon DB
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ connectionString })
  
  // TAMBAHAN BARU: Tangkap error jika koneksi idle diputus sepihak
  pool.on('error', (err) => {
    console.error('Koneksi database pool terputus (idle):', err.message);
  });

  const adapter = new PrismaPg(pool)
  
  // Masukkan adapter ke PrismaClient
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = db