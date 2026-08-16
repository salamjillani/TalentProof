import { NextResponse } from 'next/server';
import db from '@/services/db';
import { embedText } from '@/services/embeddingService';
import { getAllCandidatesWithEmbeddings, topKSimilar } from '@/services/vectorSearch';
import { synthesizeCandidateSearchAnswer } from '@/services/aiService';

const TOP_K = 5;

// The RAG search endpoint: embed the query, retrieve the most similar
// candidates across every past screening session, then ask the model to
// answer using ONLY those retrieved candidates. The model never sees the
// full candidate pool, which is what makes this genuine retrieval rather
// than "paste everything into one prompt."
export async function POST(request) {
  try {
    const { query } = await request.json();

    if (!query || query.trim() === '') {
      return NextResponse.json({ success: false, error: 'Search query cannot be empty.' }, { status: 400 });
    }

    const candidates = await getAllCandidatesWithEmbeddings(db);
    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        query,
        answer: null,
        retrievedCandidates: [],
        message: 'No screened candidates with embeddings found yet. Screen some resumes first.'
      });
    }

    let queryVector;
    try {
      queryVector = await embedText(query);
    } catch (embedErr) {
      console.error('Query embedding failed:', embedErr);
      return NextResponse.json({ success: false, error: 'AI is temporarily unavailable, please try again.' }, { status: 503 });
    }

    const retrieved = topKSimilar(queryVector, candidates, TOP_K);
    const retrievedCandidates = retrieved.map(c => ({
      id: c.id,
      candidateName: c.candidateName,
      fileName: c.fileName,
      targetRole: c.targetRole,
      sessionDate: c.sessionDate,
      matchPercentage: c.matchPercentage,
      matchedSkills: c.matchedSkills,
      missingSkills: c.missingSkills,
      justification: c.justification,
      similarity: Math.round(c.similarity * 100)
    }));

    // Retrieval succeeded (honest math) — if the synthesis step now fails,
    // we still return the ranked candidates with answer: null rather than
    // hard-failing the whole request, since showing real retrieved data
    // isn't a fake result, just an incomplete one.
    let answer = null;
    let answerError = null;
    try {
      answer = await synthesizeCandidateSearchAnswer(query, retrieved);
    } catch (synthErr) {
      console.error('Answer synthesis failed:', synthErr);
      answerError = 'AI is temporarily unavailable — showing retrieved candidates without a written answer.';
    }

    return NextResponse.json({ success: true, query, answer, answerError, retrievedCandidates });
  } catch (error) {
    console.error('Resume search failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
