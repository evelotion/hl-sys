import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; 

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  // 1. Ubah tipe params menjadi Promise
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const body = await request.json();
    const { proofUrl } = body;
    
    // 2. Await params-nya sebelum diambil id-nya
    const resolvedParams = await params;
    const ticketId = resolvedParams.id; 

    if (!proofUrl) {
      return NextResponse.json(
        { error: 'URL Bukti kerja wajib dikirim, Bro!' }, 
        { status: 400 }
      );
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'DONE',       
        proofImgUrl: proofUrl,   
        resolvedAt: new Date(), 
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Tiket berhasil ditutup!',
      ticket: updatedTicket 
    });

  } catch (error) {
    console.error('Error saat update tiket:', error);
    return NextResponse.json(
      { error: 'Gagal update status tiket ke database' }, 
      { status: 500 }
    );
  }
}