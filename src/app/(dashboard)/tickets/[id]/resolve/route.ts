import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; 

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    // Kita tetep tangkap variabel proofUrl dari body request (dari TaskViewClient)
    const { proofUrl } = body;
    
    // ID aman sebagai string sesuai schema (UUID)
    const ticketId = params.id; 

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
        // Masukin URL gambar ke kolom 'proofImgUrl' sesuai schema.prisma lo
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