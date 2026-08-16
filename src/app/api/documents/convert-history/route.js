import { NextResponse } from 'next/server';
import db from '@/services/db';

export async function GET() {
  try {
    const list = await db.getConversions();
    // Sort newest first
    const sorted = [...list].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return NextResponse.json({ success: true, conversions: sorted });
  } catch (error) {
    console.error('Failed to get conversions history:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
