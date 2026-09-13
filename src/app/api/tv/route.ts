// src/app/api/tv/route.ts
// Endpoint polling untuk Mode TV. Wajib login dan punya permission tv:view.
import { NextResponse } from 'next/server';
import { requirePermission, authErrorResponse } from '@/src/lib/auth';
import { getTvData } from '@/src/lib/tvStats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requirePermission('tv:view');
    const data = await getTvData();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('TV data error:', error);
    return NextResponse.json({ error: 'Gagal memuat data' }, { status: 500 });
  }
}
