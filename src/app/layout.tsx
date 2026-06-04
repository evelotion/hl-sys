import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast"; // <-- Tambahan import Toaster
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Udah gue sesuaikan metadatanya biar lebih profesional (bukan bawaan Next.js lagi)
export const metadata: Metadata = {
  title: "HL-SYS | Hotline Logistik",
  description: "Sistem Hotline Logistik Terintegrasi - Departemen Logistik",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id" // <-- Gue ganti ke "id" karena aplikasi lo bahasa Indonesia
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        
        {/* Tambahan komponen Toaster biar notif sukses/error muncul */}
        <Toaster 
          position="top-center" 
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 'bold',
            },
          }}
        />
      </body>
    </html>
  );
}