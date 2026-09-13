// src/app/api/dashboard/bidang/route.ts
import { NextResponse } from 'next/server';
import { requirePermission, authErrorResponse } from '@/src/lib/auth';
import { getBidangBreakdown, type BidangPeriod } from '@/src/lib/dashboardStats';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePermission('dashboard:view');
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period');
    const period: BidangPeriod = periodParam === 'year' || periodParam === 'all' ? periodParam : 'month';

    const data = await getBidangBreakdown(period);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Bidang breakdown error:', error);
    return NextResponse.json({ error: 'Gagal memuat data' }, { status: 500 });
  }
}
