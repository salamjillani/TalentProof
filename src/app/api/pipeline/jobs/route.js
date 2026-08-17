import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/services/db';
import { getApplyEmailAddress } from '@/services/emailService';

export async function GET() {
  try {
    const jobs = await db.getJobPostings();
    const sorted = [...jobs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(job => ({ ...job, applyEmail: getApplyEmailAddress(job.id) }));
    return NextResponse.json({ success: true, jobs: sorted });
  } catch (error) {
    console.error('Failed to get job postings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { title, description } = await request.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Job title is required.' }, { status: 400 });
    }
    const posting = {
      id: uuidv4(),
      title: title.trim(),
      description: (description || '').trim(),
      createdAt: new Date().toISOString(),
    };
    await db.saveJobPosting(posting);
    return NextResponse.json({ success: true, job: { ...posting, applyEmail: getApplyEmailAddress(posting.id) } });
  } catch (error) {
    console.error('Failed to create job posting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
