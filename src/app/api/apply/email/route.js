import { NextResponse } from 'next/server';
import { scoreAndSaveApplication } from '@/services/applicationService';

// Called by the Google Apps Script inbox watcher, not by any browser.
// Protected by a shared secret (never exposed to the public apply page)
// since without it, anyone who found this URL could POST fake applications
// directly, skipping the actual email entirely.
export async function POST(request) {
  try {
    const secret = process.env.EMAIL_APPLY_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, error: 'Email apply intake is not configured.' }, { status: 503 });
    }
    if (request.headers.get('x-apply-secret') !== secret) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { jobPostingId, candidateEmail, candidateName, fileName, fileBase64 } = await request.json();

    if (!jobPostingId) {
      return NextResponse.json({ success: false, error: 'Missing job posting.' }, { status: 400 });
    }
    if (!candidateEmail || !candidateEmail.trim()) {
      return NextResponse.json({ success: false, error: 'Missing sender email.' }, { status: 400 });
    }
    if (!fileName || !fileBase64) {
      return NextResponse.json({ success: false, error: 'Missing resume attachment.' }, { status: 400 });
    }

    const application = await scoreAndSaveApplication({
      jobPostingId,
      candidateEmail,
      candidateNameInput: candidateName,
      fileBuffer: Buffer.from(fileBase64, 'base64'),
      originalFileName: fileName,
    });

    return NextResponse.json({ success: true, applicationId: application.id, matchPercentage: application.matchPercentage });
  } catch (error) {
    console.error('Email application intake failed:', error);
    const status = error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
