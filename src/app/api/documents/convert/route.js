import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '@/services/db';
import { convertDocxToPdf, convertPdfToDocx } from '@/services/convertService';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const format = formData.get('format'); // 'pdf' or 'docx'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    if (!format || (format !== 'pdf' && format !== 'docx')) {
      return NextResponse.json({ success: false, error: 'Invalid target format. Supported formats: pdf, docx' }, { status: 400 });
    }

    const originalName = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let outputBuffer;
    let mimeType;
    let outFileName;

    if (format === 'pdf') {
      outputBuffer = await convertDocxToPdf(fileBuffer);
      mimeType = 'application/pdf';
      outFileName = `${originalName.replace(/\.[^/.]+$/, '')}.pdf`;
    } else {
      outputBuffer = await convertPdfToDocx(fileBuffer);
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      outFileName = `${originalName.replace(/\.[^/.]+$/, '')}.docx`;
    }

    // Save to disk and database conversions history
    const conversionId = uuidv4();
    const uploadsDir = db.getUploadsDir();
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const fileName = `conv_${conversionId}.${format}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, outputBuffer);

    if (!db.isWritable()) {
      await fetch(`https://kvdb.io/${db.getBucketId()}/file_${conversionId}`, {
        method: 'PUT',
        body: outputBuffer
      });
    }

    db.saveConversion({
      id: conversionId,
      originalName,
      targetName: outFileName,
      sourceFormat: format === 'pdf' ? 'docx' : 'pdf',
      targetFormat: format,
      size: outputBuffer.length,
      path: filePath,
      timestamp: new Date().toISOString()
    });

    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(outFileName)}"`
      }
    });
  } catch (error) {
    console.error('File conversion failed:', error);
    return NextResponse.json({ success: false, error: 'Conversion failed', details: error.message }, { status: 500 });
  }
}
