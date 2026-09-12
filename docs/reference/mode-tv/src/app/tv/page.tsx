// src/app/tv/page.tsx
// Mode TV: di luar route group (dashboard) supaya tanpa sidebar.
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Poppins } from 'next/font/google';
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
  const cookieStore = await cookies();
  if (!cookieStore.get('user_session')?.value) redirect('/login');

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
