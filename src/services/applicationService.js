import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from './db';
import { extractDocumentContent } from './ocrService';
import { analyzeResumeMatch } from './aiService';
import { embedText } from './embeddingService';

// Shared by both application intake paths (the public web form at
// /api/apply and the email intake at /api/apply/email): extract the
// resume, score it against the job, verify evidence, embed it, save it.
// Same scoring code either way, so an emailed application is judged
// identically to one submitted through the form.
export async function scoreAndSaveApplication({ jobPostingId, candidateEmail, candidateNameInput, fileBuffer, originalFileName }) {
  const job = await db.getJobPosting(jobPostingId);
  if (!job) {
    const err = new Error('This job posting no longer exists.');
    err.statusCode = 404;
    throw err;
  }

  const fileId = uuidv4();
  const ext = originalFileName.split('.').pop();
  const tempDir = db.getUploadsDir();
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempPath = path.join(tempDir, `temp_${fileId}.${ext}`);

  let text;
  try {
    fs.writeFileSync(tempPath, fileBuffer);
    const extracted = await extractDocumentContent(tempPath, originalFileName);
    text = extracted.text;
  } finally {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) { console.error('Failed to unlink temp file:', e.message); }
    }
  }

  if (!text || !text.trim()) {
    const err = new Error('We could not read any text from that file.');
    err.statusCode = 422;
    throw err;
  }

  const roleContext = job.description ? `${job.title}\n\n${job.description}` : job.title;

  let analysis;
  try {
    analysis = await analyzeResumeMatch(text, roleContext);
  } catch (err) {
    console.error('Application screening failed:', err);
    const wrapped = new Error('We are temporarily unable to process applications, please try again shortly.');
    wrapped.statusCode = 503;
    throw wrapped;
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
    fileName: originalFileName,
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
  await db.saveApplication(application);
  return application;
}
