import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '@/services/db';
import { extractDocumentContent } from '@/services/ocrService';
import { generateSummary } from '@/services/aiService';

// Standalone document summarizer: upload any one PDF/DOCX (a resume, a job
// description, a policy doc, whatever) and get a structured AI summary.
// Deliberately separate from the resume screening pipeline — this isn't
// scored against a role, it's just "what does this document say."
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No document uploaded.' }, { status: 400 });
    }

    const originalname = file.name;
    const fileId = uuidv4();
    const ext = originalname.split('.').pop();
    const tempDir = db.getUploadsDir();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempPath = path.join(tempDir, `temp_${fileId}.${ext}`);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tempPath, buffer);

      const { text } = await extractDocumentContent(tempPath, originalname);
      if (!text || text.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'No readable text could be extracted from this document.' }, { status: 422 });
      }

      // No local fallback here on purpose: if the AI call fails, the request
      // fails honestly rather than returning a fabricated summary.
      const summary = await generateSummary(text);

      const session = {
        id: uuidv4(),
        fileName: originalname,
        date: new Date().toISOString(),
        summary
      };
      db.saveSummarySession(session);

      return NextResponse.json({ success: true, session });
    } finally {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          console.error('Failed to unlink temp file:', e.message);
        }
      }
    }
  } catch (error) {
    console.error('Document summarization failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
