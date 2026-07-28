import { NextResponse } from 'next/server';
import db from '@/services/db';

export async function GET() {
  try {
    const sessions = db.getResumeSessions();
    // Sort newest sessions first
    const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    return NextResponse.json({ success: true, sessions: sorted });
  } catch (error) {
    console.error('Failed to get resume sessions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
