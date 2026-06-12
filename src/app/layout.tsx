// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

// Ini otomatis bikin tag <meta name="color-scheme" content="light only" />
export const metadata: Metadata = {
  title: 'HL-SYS | Logistik Pusat',
  description: 'Sistem Manajemen Tiket Logistik',
  colorScheme: 'light', 
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Tambahin class "light" dan mematikan dark mode bawaan browser
    <html lang="id" className="light" style={{ colorScheme: 'light' }}>
      {/* Kasih warna dasar bg-slate-50 dan text-slate-900 biar aman */}
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen`}>
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  )
}