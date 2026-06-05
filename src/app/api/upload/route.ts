// hl-sys/src/app/api/upload/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Terima file dari Frontend
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Ambil Env Cloudinary lo
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'hl_sys_preset';

    if (!cloudName) {
      return NextResponse.json({ error: 'Env Cloudinary belum disetting di server' }, { status: 500 });
    }

    // 2. Bungkus ulang file-nya untuk dikirim ke Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', uploadPreset);

    // 3. Nembak ke Cloudinary DARI SERVER (Ini yang bikin kebal CORS & Firewall)
    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryFormData,
      }
    );

    const data = await cloudinaryRes.json();

    // 4. Balikin URL gambarnya ke Frontend
    if (data.secure_url) {
      return NextResponse.json({ success: true, url: data.secure_url });
    } else {
      console.error("Cloudinary Error Response:", data);
      return NextResponse.json({ error: 'Ditolak oleh Cloudinary', details: data }, { status: 400 });
    }

  } catch (error) {
    console.error('Error Backend Upload:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem di Backend' }, { status: 500 });
  }
}