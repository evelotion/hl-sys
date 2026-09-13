import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/src/lib/db';
import { requirePermission, authErrorResponse } from '@/src/lib/auth';
import { VALID_ROLES, VALID_TEAMS, BIDANG_REQUIRED_ROLES } from '@/src/lib/roles';

export async function POST(req: Request) {
  try {
    await requirePermission('user:manage');
    const body = await req.json();

    // Whitelist field: hanya initial, name, phone, email, role, team. Password TIDAK bisa di-set lewat sini.
    const { initial, name, phone, email, role, team } = body;

    if (typeof initial !== 'string' || !initial.trim() || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Inisial dan nama wajib diisi' }, { status: 400 });
    }
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }
    if (team !== undefined && !VALID_TEAMS.includes(team)) {
      return NextResponse.json({ error: 'Bidang tidak valid' }, { status: 400 });
    }

    const effectiveRole = role || 'PIC_LOGISTIK';
    if (BIDANG_REQUIRED_ROLES.includes(effectiveRole) && !team) {
      return NextResponse.json({ error: 'Bidang wajib diisi untuk role ini' }, { status: 400 });
    }

    const newUser = await db.user.create({
      data: {
        initial: initial.trim().toUpperCase(),
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        role: effectiveRole,
        team: team || 'Lainnya',
      },
      select: { id: true, initial: true, name: true, phone: true, email: true, role: true, team: true },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Inisial sudah dipakai user lain.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal membuat user' }, { status: 500 });
  }
}
