import { NextResponse } from 'next/server';
import db from '@/services/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const job = db.getJobPosting(id);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job posting not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Failed to get job posting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    db.deleteJobPosting(id);
    return NextResponse.json({ success: true, message: 'Job posting deleted.' });
  } catch (error) {
    console.error('Failed to delete job posting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
