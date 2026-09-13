// src/app/tv/page.tsx
// Mode TV: di luar route group (dashboard) supaya tanpa sidebar.
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { requireUserForPage } from '@/src/lib/auth';
import { can } from '@/src/lib/roles';
import { getTvData, type TvData } from '@/src/lib/tvStats';
import TvDisplayClient from './TvDisplayClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mode TV | HL-SYS',
};

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export default async function TvPage() {
  const user = await requireUserForPage();

  if (!can(user, 'tv:view')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="mb-2 text-lg font-black text-slate-800">Akses Ditolak</h2>
          <p className="text-sm text-slate-500">Anda tidak memiliki izin untuk membuka Mode TV.</p>
        </div>
      </div>
    );
  }

  let initialData: TvData | null = null;
  try {
    initialData = await getTvData();
  } catch (error) {
    // Kalau gagal di awal, client akan coba lagi lewat polling
    console.error('TV initial data error:', error);
  }

  return (
    <div className={poppins.className}>
      <TvDisplayClient initialData={initialData} />
    </div>
  );
}
