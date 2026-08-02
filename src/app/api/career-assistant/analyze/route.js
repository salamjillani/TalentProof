import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '@/services/db';
import { extractDocumentContent } from '@/services/ocrService';
import { analyzeResumeMatch, generateInterviewQuestions } from '@/services/aiService';
import { embedText } from '@/services/embeddingService';
import { searchJobs, rankJobsByFit } from '@/services/jobSearchService';

// The job-seeker self-service flow: upload your OWN resume once, get your
// own match score against a role, tailored interview prep, and live
// postings for that role ranked by fit — all in a single request, nothing
// saved server-side, no visibility into any other candidate's data. This is
// the privacy boundary that makes it safe to expose to a "Job Seeker" role
// distinct from the recruiter-facing Bulk Resume Screener.
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const targetRole = formData.get('targetRole');
    const jobDescription = formData.get('jobDescription') || '';
    const location = formData.get('location') || '';
    const country = formData.get('country') || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'Please upload your resume.' }, { status: 400 });
    }
    if (!targetRole || !targetRole.trim()) {
      return NextResponse.json({ success: false, error: 'Please provide a target role or keyword.' }, { status: 400 });
    }

    const originalname = file.name;
    const fileId = uuidv4();
    const ext = originalname.split('.').pop();
    const tempDir = db.getUploadsDir();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempPath = path.join(tempDir, `temp_${fileId}.${ext}`);

    let resumeText;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tempPath, buffer);
      const extracted = await extractDocumentContent(tempPath, originalname);
      resumeText = extracted.text;
    } finally {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (e) { console.error('Failed to unlink temp file:', e.message); }
      }
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'No readable text could be extracted from this resume.' }, { status: 422 });
    }

    // Match scoring uses the full JD if pasted (more accurate), otherwise
    // just the short role/keyword — same tolerant design as the recruiter
    // search endpoints, which accept either shape of input.
    const matchAgainst = jobDescription.trim() || targetRole;

    let analysis;
    try {
      analysis = await analyzeResumeMatch(resumeText, matchAgainst);
    } catch (err) {
      console.error('Resume match analysis failed:', err);
      return NextResponse.json({ success: false, error: 'AI is temporarily unavailable, please try again.' }, { status: 503 });
    }

    // Interview prep and live job search are each independently best-effort:
    // a failure in one must not hide a result that succeeded in another.
    let interviewQuestions = null;
    let interviewError = null;
    try {
      const prep = await generateInterviewQuestions(targetRole, 'Not specified', (analysis.matchedSkills || []).join(', '));
      interviewQuestions = prep.questions || [];
    } catch (err) {
      console.error('Interview prep generation failed:', err);
      interviewError = 'AI is temporarily unavailable — interview prep could not be generated.';
    }

    let jobs = [];
    let jobsRanked = false;
    let jobsError = null;
    try {
      const liveJobs = await searchJobs({ role: targetRole, location, country });
      if (liveJobs.length > 0) {
        try {
          const resumeEmbedding = await embedText(resumeText);
          jobs = await rankJobsByFit(liveJobs, resumeEmbedding);
          jobsRanked = true;
        } catch (embedErr) {
          console.error('Resume embedding failed, returning unranked jobs:', embedErr);
          jobs = liveJobs;
        }
      }
    } catch (err) {
      console.error('Live job search failed:', err);
      jobsError = err.message;
    }

    return NextResponse.json({
      success: true,
      candidateName: analysis.candidateName || 'You',
      matchPercentage: analysis.matchPercentage,
      matchedSkills: analysis.matchedSkills || [],
      missingSkills: analysis.missingSkills || [],
      justification: analysis.justification,
      evidence: analysis.evidence || [],
      interviewQuestions,
      interviewError,
      jobs,
      jobsRanked,
      jobsError
    });
  } catch (error) {
    console.error('Career assistant analysis failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
