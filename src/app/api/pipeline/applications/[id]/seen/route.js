import { NextResponse } from 'next/server';
import db from '@/services/db';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const updated = db.updateApplication(id, { seenByRecruiter: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark application seen:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
