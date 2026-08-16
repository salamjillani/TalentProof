import { NextResponse } from 'next/server';
import db from '@/services/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const success = await db.deleteResumeSession(id);
    return NextResponse.json({ success, message: 'Screening session deleted.' });
  } catch (error) {
    console.error('Failed to delete resume session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
