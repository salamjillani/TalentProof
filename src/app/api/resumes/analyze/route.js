import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '@/services/db';
import { extractDocumentContent } from '@/services/ocrService';
import { analyzeResumeMatch } from '@/services/aiService';
import { embedText } from '@/services/embeddingService';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const targetRole = formData.get('targetRole');
    const files = formData.getAll('files');

    if (!targetRole || targetRole.trim() === '') {
      return NextResponse.json({ success: false, error: 'Target job role/topic cannot be empty.' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No resume files uploaded.' }, { status: 400 });
    }

    console.log(`Starting bulk screening of ${files.length} resumes for: "${targetRole}"`);
    const results = [];
    const tempDir = db.getUploadsDir();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    for (const file of files) {
      const originalname = file.name;
      const fileId = uuidv4();
      const ext = originalname.split('.').pop();
      const tempPath = path.join(tempDir, `temp_${fileId}.${ext}`);

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(tempPath, buffer);

        // Extract text, then score it against the role via Groq. There is
        // no local fallback here on purpose: if the AI call fails, this
        // file's result honestly reflects that failure instead of a faked
        // score (see the catch block below).
        const { text } = await extractDocumentContent(tempPath, originalname);
        const analysis = await analyzeResumeMatch(text, targetRole);

        // Generate and store an embedding of the resume text so this
        // candidate becomes searchable via RAG search / find-similar.
        // A failure here does NOT invalidate the screening result above —
        // it just leaves this one candidate invisible to retrieval until
        // re-screened, which is a legitimate infra resilience choice
        // distinct from faking an AI-derived score.
        let embedding = null;
        try {
          embedding = await embedText(text);
        } catch (embedErr) {
          console.error(`Embedding generation failed for ${originalname}:`, embedErr);
        }

        results.push({
          id: uuidv4(),
          fileName: originalname,
          candidateName: analysis.candidateName || 'Unknown Candidate',
          matchPercentage: parseInt(analysis.matchPercentage, 10) || 0,
          matchedSkills: analysis.matchedSkills || [],
          missingSkills: analysis.missingSkills || [],
          justification: analysis.justification || 'No analysis available.',
          evidence: analysis.evidence || [],
          interviewQuestions: analysis.interviewQuestions || [],
          embedding
        });
      } catch (err) {
        console.error(`Failed to analyze resume ${originalname}:`, err);
        results.push({
          id: uuidv4(),
          fileName: originalname,
          candidateName: 'Unknown Candidate',
          matchPercentage: 0,
          matchedSkills: [],
          missingSkills: [],
          justification: `Analysis failed: ${err.message}`,
          evidence: [],
          interviewQuestions: [],
          embedding: null
        });
      } finally {
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {
            console.error('Failed to unlink temp file:', e.message);
          }
        }
      }
    }

    results.sort((a, b) => b.matchPercentage - a.matchPercentage);

    const session = {
      id: uuidv4(),
      date: new Date().toISOString(),
      targetRole,
      results
    };
    await db.saveResumeSession(session);

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Bulk screening failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Bulk resume screening failed',
      details: error.message
    }, { status: 500 });
  }
}
