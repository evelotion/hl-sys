// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { requirePermission, authErrorResponse } from '@/src/lib/auth';
import { VALID_ROLES, VALID_TEAMS } from '@/src/lib/roles';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await requirePermission('user:manage');
    const resolvedParams = await params;
    const targetId = resolvedParams.id;
    const body = await req.json();

    // Whitelist field: hanya initial, name, phone, email, role, team. Password TIDAK bisa di-set lewat sini.
    const { initial, name, phone, email, role, team } = body;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }
    if (team !== undefined && !VALID_TEAMS.includes(team)) {
      return NextResponse.json({ error: 'Bidang tidak valid' }, { status: 400 });
    }
    if (targetId === sessionUser.id && role !== undefined && role !== sessionUser.role) {
      return NextResponse.json({ error: 'Tidak bisa mengubah role akun sendiri' }, { status: 400 });
    }

    const data: { initial?: string; name?: string; phone?: string | null; email?: string | null; role?: string; team?: string } = {};
    if (initial !== undefined) data.initial = String(initial).trim().toUpperCase();
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;
    if (role !== undefined) data.role = role;
    if (team !== undefined) data.team = team;

    const updatedUser = await db.user.update({
      where: { id: targetId },
      data,
      select: { id: true, initial: true, name: true, phone: true, email: true, role: true, team: true },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: 'Gagal update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await requirePermission('user:manage');
    const resolvedParams = await params;
    const targetId = resolvedParams.id;

    if (targetId === sessionUser.id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
    }

    await db.user.delete({ where: { id: targetId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: 'Gagal delete user' }, { status: 500 });
  }
}
