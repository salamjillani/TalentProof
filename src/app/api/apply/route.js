import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '@/services/db';
import { extractDocumentContent } from '@/services/ocrService';
import { analyzeResumeMatch } from '@/services/aiService';
import { embedText } from '@/services/embeddingService';

// Public, unauthenticated endpoint: this is the front door candidates use
// instead of emailing a resume to HR. Deliberately returns nothing about the
// score, evidence, or match, only a plain confirmation — that information
// is recruiter-only, surfaced through /api/pipeline/applications instead.
export async function POST(request) {
  try {
    const formData = await request.formData();
    const jobPostingId = formData.get('jobPostingId');
    const candidateEmail = formData.get('candidateEmail');
    const candidateNameInput = formData.get('candidateName');
    const file = formData.get('file');

    if (!jobPostingId) {
      return NextResponse.json({ success: false, error: 'Missing job posting.' }, { status: 400 });
    }
    if (!candidateEmail || !candidateEmail.trim()) {
      return NextResponse.json({ success: false, error: 'Please provide your email address.' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ success: false, error: 'Please upload your resume.' }, { status: 400 });
    }

    const job = db.getJobPosting(jobPostingId);
    if (!job) {
      return NextResponse.json({ success: false, error: 'This job posting no longer exists.' }, { status: 404 });
    }

    const originalname = file.name;
    const fileId = uuidv4();
    const ext = originalname.split('.').pop();
    const tempDir = db.getUploadsDir();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempPath = path.join(tempDir, `temp_${fileId}.${ext}`);

    let text;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tempPath, buffer);
      const extracted = await extractDocumentContent(tempPath, originalname);
      text = extracted.text;
    } finally {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (e) { console.error('Failed to unlink temp file:', e.message); }
      }
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'We could not read any text from that file. Please try a different file.' }, { status: 422 });
    }

    const roleContext = job.description ? `${job.title}\n\n${job.description}` : job.title;

    let analysis;
    try {
      analysis = await analyzeResumeMatch(text, roleContext);
    } catch (err) {
      console.error('Application screening failed:', err);
      return NextResponse.json({ success: false, error: 'We are temporarily unable to process applications, please try again shortly.' }, { status: 503 });
    }

    let embedding = null;
    try {
      embedding = await embedText(text);
    } catch (embedErr) {
      console.error('Embedding generation failed for application:', embedErr);
    }

    const application = {
      id: uuidv4(),
      jobPostingId,
      candidateName: (analysis.candidateName && analysis.candidateName !== 'Unknown Candidate')
        ? analysis.candidateName
        : (candidateNameInput || 'Unknown Candidate'),
      candidateEmail: candidateEmail.trim(),
      fileName: originalname,
      appliedAt: new Date().toISOString(),
      stage: 'applied',
      matchPercentage: parseInt(analysis.matchPercentage, 10) || 0,
      matchedSkills: analysis.matchedSkills || [],
      missingSkills: analysis.missingSkills || [],
      justification: analysis.justification || '',
      evidence: analysis.evidence || [],
      embedding,
      seenByRecruiter: false,
      emailDrafts: [],
    };
    db.saveApplication(application);

    return NextResponse.json({ success: true, message: 'Your application has been received. Thank you for applying.' });
  } catch (error) {
    console.error('Application submission failed:', error);
    return NextResponse.json({ success: false, error: 'Something went wrong submitting your application. Please try again.' }, { status: 500 });
  }
}
