// src/app/api/tv/route.ts
// Endpoint polling untuk Mode TV. Wajib ada sesi login.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTvData } from '@/src/lib/tvStats';

export const dynamic = 'force-dynamic';

function hasValidSession(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    return typeof s?.id === 'string' && s.id.length > 0;
  } catch {
    return false;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  if (!hasValidSession(cookieStore.get('user_session')?.value)) {
    return NextResponse.json({ error: 'Sesi login berakhir' }, { status: 401 });
  }

  try {
    const data = await getTvData();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('TV data error:', error);
    return NextResponse.json({ error: 'Gagal memuat data' }, { status: 500 });
  }
}
