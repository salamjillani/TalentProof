import { NextResponse } from 'next/server';
import { scoreAndSaveApplication } from '@/services/applicationService';

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

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await scoreAndSaveApplication({
      jobPostingId,
      candidateEmail,
      candidateNameInput,
      fileBuffer,
      originalFileName: file.name,
    });

    return NextResponse.json({ success: true, message: 'Your application has been received. Thank you for applying.' });
  } catch (error) {
    console.error('Application submission failed:', error);
    const status = error.statusCode || 500;
    const message = error.statusCode ? error.message : 'Something went wrong submitting your application. Please try again.';
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
