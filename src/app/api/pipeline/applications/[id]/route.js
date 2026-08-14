import { NextResponse } from 'next/server';
import db from '@/services/db';
import { getRecommendation, isValidStage } from '@/services/pipelineService';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const application = db.getApplication(id);
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      application: { ...application, embedding: undefined, recommendation: getRecommendation(application) },
    });
  } catch (error) {
    console.error('Failed to get application:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// The human-approval checkpoint: the AI only ever recommends a stage move
// (see pipelineService.getRecommendation); nothing changes in the pipeline
// until a recruiter calls this route themselves, from the UI's Approve button.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { stage } = await request.json();

    if (!stage || !isValidStage(stage)) {
      return NextResponse.json({ success: false, error: 'Invalid stage.' }, { status: 400 });
    }

    const updated = db.updateApplication(id, { stage, stageUpdatedAt: new Date().toISOString() });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      application: { ...updated, embedding: undefined, recommendation: getRecommendation(updated) },
    });
  } catch (error) {
    console.error('Failed to update application stage:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
