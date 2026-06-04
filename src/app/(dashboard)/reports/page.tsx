import React from 'react';
import { db } from '../../../lib/db';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  // Ambil semua data tiket lengkap dengan relasi PIC
  const tickets = await db.ticket.findMany({
    orderBy: { createdAt: 'desc' },
    include: { pic: true }
  });
  return <ReportsClient tickets={tickets} />;
}