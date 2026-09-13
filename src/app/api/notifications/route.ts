// hl-sys/src/app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { getCurrentUser } from '@/src/lib/auth';
import { ticketScopeWhere } from '@/src/lib/roles';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, data: [] }, { status: 401 });
    }

    const scope = ticketScopeWhere(user);
    const whereClause = Object.keys(scope).length > 0 ? { ticket: scope } : {};

    const logs = await db.activityLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 15, // Ambil 15 notifikasi terbaru
      select: {
        id: true,
        action: true,
        message: true,
        createdAt: true,
        user: { select: { name: true, initial: true, role: true } },
        ticket: { select: { ticketNumber: true, id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Notification Fetch Error:", error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
