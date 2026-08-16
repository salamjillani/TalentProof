import { NextResponse } from 'next/server';
import db from '@/services/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.deleteSummarySession(id);
    return NextResponse.json({ success: true, message: 'Summary deleted.' });
  } catch (error) {
    console.error('Failed to delete summary session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
