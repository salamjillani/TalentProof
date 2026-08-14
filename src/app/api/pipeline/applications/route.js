import { NextResponse } from 'next/server';
import db from '@/services/db';
import { getRecommendation } from '@/services/pipelineService';

// Recruiter-facing only: this is the one place score/evidence/recommendation
// are ever exposed. The public /api/apply route never returns any of this.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobPostingId = searchParams.get('jobPostingId');

    const applications = db.getApplications(jobPostingId || null);
    const withRecommendation = applications
      .map(app => ({ ...app, embedding: undefined, recommendation: getRecommendation(app) }))
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    return NextResponse.json({ success: true, applications: withRecommendation });
  } catch (error) {
    console.error('Failed to get applications:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
