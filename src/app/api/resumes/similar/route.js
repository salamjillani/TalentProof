import { NextResponse } from 'next/server';
import db from '@/services/db';
import { getAllCandidatesWithEmbeddings, topKSimilar } from '@/services/vectorSearch';
import { explainSimilarity } from '@/services/aiService';

const TOP_K = 5;

// "Find Similar Candidates": the query vector here is an existing
// candidate's own stored embedding, not freshly-embedded text. The core
// ranked result is pure vector math and requires no AI call at all — it
// works even with no GROQ_API_KEY set.
//
// Two request shapes:
//   { candidateId }                    -> ranked similar-candidate list (no AI call)
//   { candidateId, explainForId }      -> just the one written explanation for that
//                                          specific pair, fetched lazily on click so we
//                                          don't spend 5 Groq calls when the user only
//                                          asked about 1 candidate. A failure here is
//                                          returned as explanation: null, never faked.
export async function POST(request) {
  try {
    const { candidateId, explainForId } = await request.json();

    if (!candidateId) {
      return NextResponse.json({ success: false, error: 'candidateId is required.' }, { status: 400 });
    }

    const source = await db.findCandidateById(candidateId);
    if (!source) {
      return NextResponse.json({ success: false, error: 'Candidate not found.' }, { status: 404 });
    }

    if (explainForId) {
      const match = await db.findCandidateById(explainForId);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Comparison candidate not found.' }, { status: 404 });
      }
      try {
        const explanation = await explainSimilarity(source, match);
        return NextResponse.json({ success: true, explanation });
      } catch (err) {
        console.error(`Similarity explanation failed for ${match.candidateName}:`, err);
        return NextResponse.json({ success: true, explanation: null, explanationError: 'AI is temporarily unavailable.' });
      }
    }

    if (!Array.isArray(source.embedding) || source.embedding.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'This candidate has no stored embedding (screened before this feature, or embedding generation failed). Re-run screening for this file to enable Find Similar.'
      }, { status: 400 });
    }

    const candidates = await getAllCandidatesWithEmbeddings(db);
    const similar = topKSimilar(source.embedding, candidates, TOP_K, candidateId);

    const similarCandidates = similar.map(c => ({
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

    return NextResponse.json({
      success: true,
      sourceCandidate: {
        id: source.id,
        candidateName: source.candidateName,
        fileName: source.fileName,
        targetRole: source.targetRole
      },
      similarCandidates
    });
  } catch (error) {
    console.error('Find similar candidates failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
