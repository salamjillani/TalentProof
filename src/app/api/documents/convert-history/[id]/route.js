import { NextResponse } from 'next/server';
import fs from 'fs';
import db from '@/services/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const list = await db.getConversions();
    const item = list.find(c => c.id === id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Conversion record not found.' }, { status: 404 });
    }

    let fileBuffer;
    if (fs.existsSync(item.path)) {
      fileBuffer = fs.readFileSync(item.path);
    } else {
      const res = await fetch(`https://kvdb.io/${db.getBucketId()}/file_${id}`);
      if (!res.ok) {
        return NextResponse.json({ success: false, error: 'Converted file not found in cloud storage.' }, { status: 404 });
      }
      fileBuffer = Buffer.from(await res.arrayBuffer());
    }
    let mimeType = 'application/octet-stream';
    if (item.targetFormat === 'pdf') {
      mimeType = 'application/pdf';
    } else if (item.targetFormat === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(item.targetName)}"`
      }
    });
  } catch (error) {
    console.error('Failed to download converted document:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const list = await db.getConversions();
    const item = list.find(c => c.id === id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Conversion record not found.' }, { status: 404 });
    }

    if (fs.existsSync(item.path)) {
      try {
        fs.unlinkSync(item.path);
      } catch (err) {
        console.warn(`Failed to unlink file ${item.path}:`, err.message);
      }
    }

    if (!db.isWritable()) {
      await fetch(`https://kvdb.io/${db.getBucketId()}/file_${id}`, {
        method: 'DELETE'
      }).catch(err => console.error('Failed to delete file from kvdb.io:', err.message));
    }

    await db.deleteConversion(id);
    return NextResponse.json({ success: true, message: 'Conversion record deleted.' });
  } catch (error) {
    console.error('Failed to delete conversion record:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
