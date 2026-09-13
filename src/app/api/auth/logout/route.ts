// hl-sys/src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/src/lib/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete('user_session'); // cookie lama, jaga-jaga masih tersisa di browser

    return NextResponse.json({ success: true, message: 'Berhasil logout' });
  } catch {
    return NextResponse.json({ error: 'Gagal logout' }, { status: 500 });
  }
}
