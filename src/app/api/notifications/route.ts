// hl-sys/src/app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('user_session')?.value;
    
    if (!sessionStr) {
      return NextResponse.json({ success: false, data: [] });
    }

    const user = JSON.parse(sessionStr);
    const safeRole = user.role?.toUpperCase() || '';
    const isHead = ['ABC', 'FER', 'RML', 'RIN'].includes(user.initial);
    const isAdmin = safeRole === 'OPERATOR' || safeRole.includes('ADMIN') || isHead;

    // Logic: Kalau Admin/Kabid lihat semua aktivitas terbaru. Kalau PIC, cuma lihat aktivitas di tiket yang di-assign ke dia.
    const whereClause = isAdmin ? {} : { ticket: { picId: user.id } };

    const logs = await db.activityLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 15, // Ambil 15 notifikasi terbaru
      include: {
        user: { select: { name: true, initial: true, role: true } },
        ticket: { select: { ticketNumber: true, id: true, title: true } }
      }
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Notification Fetch Error:", error);
    return NextResponse.json({ success: false, data: [] });
  }
}