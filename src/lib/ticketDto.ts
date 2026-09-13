// src/lib/ticketDto.ts
// Fase 6: helper untuk menghapus field sensitif dari objek tiket SEBELUM dikirim sebagai props
// ke Client Component. Field yang dihapus benar-benar tidak ada lagi di objek (bukan diganti
// nilai default) -- supaya payload RSC yang dikirim ke browser memang tidak pernah mengandung
// key-nya sama sekali untuk role yang tidak berhak (aturan keras 0.2.1 blueprint).
import type { SessionUser } from './roles';
import { can } from './roles';

export interface TicketDtoPerms {
  canSeeSla: boolean;
  canSeeContact: boolean;
}

export function getTicketDtoPerms(user: SessionUser): TicketDtoPerms {
  return { canSeeSla: can(user, 'sla:view'), canSeeContact: can(user, 'contact:view') };
}

/**
 * Menghapus slaDeadline/priority (kalau !canSeeSla) dan requesterEmail/pic.phone/pic.email
 * (kalau !canSeeContact) dari objek tiket. Dipakai sebelum ticket di-passing ke Client
 * Component -- bukan pengganti kondisi render di JSX, tapi lapisan SEBELUM itu supaya data
 * yang tidak boleh dilihat memang tidak pernah ada di payload.
 */
export function toTicketDTO<T extends Record<string, unknown>>(ticket: T, perms: TicketDtoPerms): T {
  const dto = { ...ticket } as Record<string, unknown>;

  if (!perms.canSeeSla) {
    delete dto.slaDeadline;
    delete dto.priority;
  }

  if (!perms.canSeeContact) {
    delete dto.requesterEmail;
    if (dto.pic && typeof dto.pic === 'object') {
      const picRest = { ...(dto.pic as Record<string, unknown>) };
      delete picRest.phone;
      delete picRest.email;
      dto.pic = picRest;
    }
  }

  return dto as T;
}
