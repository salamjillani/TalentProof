import { NextResponse } from 'next/server';
import { generateInterviewQuestions } from '@/services/aiService';

export async function POST(request) {
  try {
    const body = await request.json();
    const { designation, experience, skills } = body;

    if (!designation || !experience) {
      return NextResponse.json(
        { success: false, error: 'Designation and experience are required.' },
        { status: 400 }
      );
    }

    const data = await generateInterviewQuestions(designation, experience, skills || '');

    return NextResponse.json({
      success: true,
      questions: data.questions || []
    });
  } catch (error) {
    console.error('Failed to generate interview questions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
