// hl-sys/src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    // Hancurkan cookie sesi user
    cookieStore.delete('user_session');
    
    return NextResponse.json({ success: true, message: 'Berhasil logout' });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal logout' }, { status: 500 });
  }
}