// src/lib/roles.ts
import type { Prisma } from '@prisma/client';

export const ROLES = {
  OPERATOR: 'OPERATOR',
  KEPALA_DEPARTEMEN: 'KEPALA_DEPARTEMEN',
  KEPALA_BIDANG: 'KEPALA_BIDANG',
  PIC_LOGISTIK: 'PIC_LOGISTIK',
  VIEWER: 'VIEWER',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const VALID_ROLES: readonly string[] = Object.values(ROLES);

export const ROLE_LABELS: Record<RoleName, string> = {
  OPERATOR: 'Operator (Admin)',
  KEPALA_DEPARTEMEN: 'Kepala Departemen',
  KEPALA_BIDANG: 'Kepala Bidang',
  PIC_LOGISTIK: 'PIC Logistik',
  VIEWER: 'Akun Pemantau',
};

// Role yang boleh menjadi PIC ("di-assign") pada tiket. K2: Kepala Departemen TIDAK termasuk.
export const ASSIGNABLE_ROLES: readonly string[] = [ROLES.OPERATOR, ROLES.KEPALA_BIDANG, ROLES.PIC_LOGISTIK];

// Role yang boleh melihat SLA, kontak PIC/pemohon, export report, dan ganti password sendiri.
// Daftar putih eksplisit (bukan "role !== VIEWER") supaya role yang tidak dikenal/tidak valid
// ditolak, bukan otomatis diloloskan.
const SLA_CONTACT_EXPORT_PASSWORD_ROLES: readonly string[] = [
  ROLES.OPERATOR,
  ROLES.KEPALA_DEPARTEMEN,
  ROLES.KEPALA_BIDANG,
  ROLES.PIC_LOGISTIK,
];

export const BIDANG = {
  P3: 'P3',
  PENGADAAN: 'Pengadaan',
  PEMBAYARAN: 'Pembayaran',
  LAINNYA: 'Lainnya',
} as const;

export type BidangName = (typeof BIDANG)[keyof typeof BIDANG];

export const VALID_TEAMS: readonly string[] = Object.values(BIDANG);

const MAIN_BIDANG: readonly string[] = [BIDANG.P3, BIDANG.PENGADAAN, BIDANG.PEMBAYARAN];

export function bidangOfCategory(category: string | null | undefined): BidangName {
  if (category && (MAIN_BIDANG as string[]).includes(category)) {
    return category as BidangName;
  }
  return BIDANG.LAINNYA;
}

export interface SessionUser {
  id: string;
  initial: string;
  name: string;
  role: string;
  team: string;
}

export interface TicketContext {
  picId?: string | null;
  category?: string | null;
  /** Team milik PIC yang di-assign ke tiket ini (User.team). Dipakai supaya cek permission
   * KEPALA_BIDANG konsisten dengan ticketScopeWhere, yang mengizinkan tiket berdasarkan
   * kategori ATAU bidang PIC-nya. */
  picTeam?: string | null;
}

export type Permission =
  | 'dashboard:view'
  | 'ticket:create'
  | 'ticket:edit'
  | 'ticket:delete'
  | 'ticket:status'
  | 'ticket:comment'
  | 'sla:view'
  | 'contact:view'
  | 'team:oversee'
  | 'user:manage'
  | 'report:view'
  | 'report:export'
  | 'password:change'
  | 'tv:view';

export function isAssignable(user: { role: string }): boolean {
  return ASSIGNABLE_ROLES.includes(user.role);
}

function isOwnTicket(user: SessionUser, ctx?: TicketContext): boolean {
  return !!ctx?.picId && ctx.picId === user.id;
}

function isInBidang(user: SessionUser, ctx?: TicketContext): boolean {
  if (!ctx) return false;
  if (bidangOfCategory(ctx.category) === user.team) return true;
  if (ctx.picTeam && ctx.picTeam === user.team) return true;
  return false;
}

export function can(
  user: SessionUser | null | undefined,
  permission: Permission,
  ctx?: TicketContext
): boolean {
  if (!user) return false;
  const role = user.role;

  switch (permission) {
    case 'dashboard:view':
    case 'tv:view':
    case 'report:view':
      return true;

    case 'ticket:create':
      return role === ROLES.OPERATOR || role === ROLES.KEPALA_DEPARTEMEN || role === ROLES.KEPALA_BIDANG;

    case 'ticket:edit':
    case 'ticket:delete':
      if (role === ROLES.OPERATOR || role === ROLES.KEPALA_DEPARTEMEN) return true;
      if (role === ROLES.KEPALA_BIDANG) return isInBidang(user, ctx);
      return false;

    case 'ticket:status':
      if (role === ROLES.OPERATOR || role === ROLES.KEPALA_DEPARTEMEN) return true;
      if (role === ROLES.KEPALA_BIDANG) return isInBidang(user, ctx);
      if (role === ROLES.PIC_LOGISTIK) return isOwnTicket(user, ctx);
      return false;

    case 'ticket:comment':
      if (role === ROLES.OPERATOR || role === ROLES.KEPALA_DEPARTEMEN) return true;
      if (role === ROLES.KEPALA_BIDANG) return isInBidang(user, ctx);
      if (role === ROLES.PIC_LOGISTIK) return isOwnTicket(user, ctx);
      return false;

    case 'sla:view':
    case 'contact:view':
    case 'report:export':
    case 'password:change':
      return SLA_CONTACT_EXPORT_PASSWORD_ROLES.includes(role);

    case 'team:oversee':
      return role === ROLES.KEPALA_DEPARTEMEN || role === ROLES.KEPALA_BIDANG;

    case 'user:manage':
      return role === ROLES.OPERATOR || role === ROLES.KEPALA_DEPARTEMEN;

    default:
      return false;
  }
}

/**
 * Lingkup tiket yang boleh dilihat oleh user, dipakai sebagai `where` clause Prisma.
 * KEPALA_BIDANG: tiketnya bidangnya (kategori = bidang, atau PIC anggota bidangnya).
 * Untuk bidang Lainnya, kategorinya adalah yang bukan tiga bidang utama.
 */
export function ticketScopeWhere(user: SessionUser): Prisma.TicketWhereInput {
  switch (user.role) {
    case ROLES.PIC_LOGISTIK:
      return { picId: user.id };
    case ROLES.KEPALA_BIDANG:
      if (user.team === BIDANG.LAINNYA) {
        return {
          OR: [
            { pic: { team: user.team } },
            { category: { notIn: MAIN_BIDANG as string[] } },
          ],
        };
      }
      return { OR: [{ pic: { team: user.team } }, { category: user.team }] };
    default:
      return {};
  }
}
