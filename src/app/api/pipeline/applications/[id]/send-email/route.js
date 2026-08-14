import { NextResponse } from 'next/server';
import db from '@/services/db';
import { sendEmail, isEmailConfigured } from '@/services/emailService';

export async function POST(request, { params }) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Email sending is not connected yet. Set EMAIL_USER and EMAIL_APP_PASSWORD to send real emails.',
        notConfigured: true,
      }, { status: 400 });
    }

    const { id } = await params;
    const { subject, body, draftIndex } = await request.json();

    if (!subject || !body) {
      return NextResponse.json({ success: false, error: 'Subject and body are required.' }, { status: 400 });
    }

    const application = db.getApplication(id);
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }

    await sendEmail({ to: application.candidateEmail, subject, text: body });

    if (typeof draftIndex === 'number' && application.emailDrafts && application.emailDrafts[draftIndex]) {
      const drafts = [...application.emailDrafts];
      drafts[draftIndex] = { ...drafts[draftIndex], sentAt: new Date().toISOString() };
      db.updateApplication(id, { emailDrafts: drafts });
    }

    return NextResponse.json({ success: true, message: `Email sent to ${application.candidateEmail}.` });
  } catch (error) {
    console.error('Failed to send candidate email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
