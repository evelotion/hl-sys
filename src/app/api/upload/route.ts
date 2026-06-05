// hl-sys/src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });

    // 1. Otentikasi ke Google Drive pakai JSON lo
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // Replace \n string jadi enter beneran (penting buat Vercel)
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), 
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 2. Ubah file jadi Stream biar bisa diupload
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // 3. Upload file ke Folder ID lo
    const response = await drive.files.create({
      requestBody: {
        name: `HLSYS_${Date.now()}_${file.name}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      },
      media: { mimeType: file.type, body: stream },
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = response.data.id!;

    // 4. Ubah permission file jadi "Anyone with the link can view" biar bisa di-preview di web lo
    await drive.permissions.create({
      fileId: fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    // Return link gambarnya
    return NextResponse.json({ success: true, url: response.data.webViewLink });

  } catch (error) {
    console.error('Error Drive Upload:', error);
    return NextResponse.json({ error: 'Gagal upload ke Google Drive' }, { status: 500 });
  }
}