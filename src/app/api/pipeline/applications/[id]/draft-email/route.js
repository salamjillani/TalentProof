import { NextResponse } from 'next/server';
import db from '@/services/db';
import { draftCandidateEmail } from '@/services/aiService';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { type } = await request.json(); // 'interview_invite' | 'rejection'

    if (type !== 'interview_invite' && type !== 'rejection') {
      return NextResponse.json({ success: false, error: 'Invalid email type.' }, { status: 400 });
    }

    const application = db.getApplication(id);
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }
    const job = db.getJobPosting(application.jobPostingId);

    const draft = await draftCandidateEmail(application, job ? job.title : 'the role', type);

    const drafts = [...(application.emailDrafts || []), { ...draft, type, createdAt: new Date().toISOString(), sentAt: null }];
    db.updateApplication(id, { emailDrafts: drafts });

    return NextResponse.json({ success: true, draft, draftIndex: drafts.length - 1 });
  } catch (error) {
    console.error('Failed to draft candidate email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
