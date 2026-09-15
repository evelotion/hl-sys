// hl-sys/src/app/api/tickets/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/src/lib/db';
import { computeSlaDeadline } from '@/src/lib/sla';
import { requirePermission, authErrorResponse } from '@/src/lib/auth';
import { wibYear } from '@/src/lib/time';

const TICKET_NUMBER_MAX_RETRIES = 3;

// select eksplisit -- sebelumnya db.ticket.create() di sini tidak punya select sama sekali,
// jadi mengembalikan seluruh kolom scalar Ticket (termasuk slaDeadline/priority) tanpa
// filter permission. Bukan bagian dari Fase 3, tapi dibenahi sekalian karena block ini
// ditulis ulang total di sini. Tidak ada kolom kredensial di model Ticket, jadi ini bukan
// kebocoran seperti kasus pic di Fase sebelumnya -- cuma higienis.
const TICKET_RESPONSE_SELECT = {
  id: true, ticketNumber: true, title: true, description: true, category: true, status: true,
  issueImgUrl: true, proofImgUrl: true, branchName: true, requesterName: true, requesterEmail: true,
  mediaRequest: true, requestDate: true, slaDeadline: true, picId: true, createdAt: true, resolvedAt: true, priority: true,
} as const;

type TicketResponse = Prisma.TicketGetPayload<{ select: typeof TICKET_RESPONSE_SELECT }>;

class TicketNumberConflictError extends Error {}

export async function POST(request: Request) {
  try {
    await requirePermission('ticket:create');
    const body = await request.json();

    // 1. TAMBAH requesterEmail & priority di destructuring
    const {
      title, description, category, priority, branchName,
      requesterName, requesterEmail, picId, requestDate,
      mediaRequest, issueImgUrl
    } = body;

    const baseDate = requestDate ? new Date(requestDate) : new Date();

    // Basis SLA adalah kategori tiket (src/lib/sla.ts), bukan prioritas.
    const deadline = computeSlaDeadline(baseDate, category);

    const ticketData = {
      title,
      description,
      category,
      priority: priority || 'MEDIUM', // <-- Simpan prioritas ke database
      branchName,
      requesterName,
      requesterEmail, // <-- Simpan email pemohon
      mediaRequest,
      requestDate: baseDate,
      slaDeadline: deadline, // <-- Masukkan deadline hari kerja
      issueImgUrl,
      picId: picId || null,
      status: 'OPEN' as const,
    };

    // Nomor tiket anti-tabrakan (Fase 3 Blueprint v3): counter per tahun (TicketCounter,
    // tahun dalam WIB) dinaikkan DAN tiketnya dibuat dalam SATU transaksi -- supaya kalau
    // ticket.create gagal karena sebab lain, kenaikan counter ikut batal (tidak ada nomor
    // yang "terbakar" tanpa tiket). upsert pada Postgres atomik per baris (INSERT ... ON
    // CONFLICT), jadi dua request bersamaan pada tahun yang sama otomatis berbaris tanpa
    // perlu isolation level khusus. TIDAK ADA panggilan jaringan/notifikasi di dalam
    // transaksi ini -- cuma dua query DB (upsert counter + create tiket).
    let newTicket: TicketResponse | undefined;
    for (let attempt = 1; attempt <= TICKET_NUMBER_MAX_RETRIES; attempt++) {
      try {
        const year = wibYear(new Date());
        newTicket = await db.$transaction(async (tx) => {
          const counter = await tx.ticketCounter.upsert({
            where: { year },
            create: { year, lastNumber: 1 },
            update: { lastNumber: { increment: 1 } },
          });
          const ticketNumber = `LOG-${year}-${String(counter.lastNumber).padStart(4, '0')}`;
          return tx.ticket.create({
            data: { ticketNumber, ...ticketData },
            select: TICKET_RESPONSE_SELECT,
          });
        });
        break;
      } catch (err) {
        // Jaring pengaman tambahan diminta blueprint -- seharusnya nyaris mustahil kena
        // P2002 (unique constraint ticketNumber) karena nomornya berasal dari counter yang
        // sudah atomik, tapi tetap ditangani. P2034 = transaction conflict/deadlock Postgres,
        // bisa muncul wajar di bawah beban tinggi.
        const isRetryable = err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2002' || err.code === 'P2034');
        if (!isRetryable) throw err;
        if (attempt === TICKET_NUMBER_MAX_RETRIES) {
          throw new TicketNumberConflictError('Gagal membuat nomor tiket setelah beberapa percobaan', { cause: err });
        }
        // lanjut ke percobaan berikutnya
      }
    }

    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof TicketNumberConflictError) {
      console.error(error.message, error.cause);
      return NextResponse.json({ error: 'Gagal membuat nomor tiket, silakan coba lagi' }, { status: 409 });
    }
    console.error("Error create ticket:", error);
    return NextResponse.json({ error: "Gagal membuat tiket" }, { status: 500 });
  }
}
