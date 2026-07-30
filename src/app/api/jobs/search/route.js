import { NextResponse } from 'next/server';
import db from '@/services/db';
import { searchJobs } from '@/services/jobSearchService';
import { embedText } from '@/services/embeddingService';
import { cosineSimilarity } from '@/services/vectorSearch';

// Cap on how many real postings get embedded+ranked per request, to bound
// latency (each is a local model call, not free of cost in time).
const MAX_JOBS_TO_RANK = 20;

// Two request shapes:
//   { role, location, country }                 -> live postings, unranked
//   { role, location, country, candidateId }     -> live postings re-ranked by
//                                                    semantic fit against that
//                                                    candidate's stored resume
//                                                    embedding (real RAG, not
//                                                    keyword matching)
export async function POST(request) {
  try {
    const { role, location, country, candidateId } = await request.json();

    if (!role || !role.trim()) {
      return NextResponse.json({ success: false, error: 'Please provide a job role or keyword to search.' }, { status: 400 });
    }

    let jobs;
    try {
      jobs = await searchJobs({ role, location, country });
    } catch (searchErr) {
      console.error('Job search failed:', searchErr);
      return NextResponse.json({ success: false, error: searchErr.message }, { status: 502 });
    }

    if (jobs.length === 0) {
      return NextResponse.json({ success: true, jobs: [], ranked: false, message: 'No live postings matched this search.' });
    }

    if (!candidateId) {
      return NextResponse.json({ success: true, jobs, ranked: false });
    }

    const candidate = db.findCandidateById(candidateId);
    if (!candidate || !Array.isArray(candidate.embedding) || candidate.embedding.length === 0) {
      return NextResponse.json({
        success: true,
        jobs,
        ranked: false,
        rankError: 'Selected candidate has no stored resume embedding to rank against (screened before this feature, or embedding generation failed at screening time).'
      });
    }

    const toRank = jobs.slice(0, MAX_JOBS_TO_RANK);
    const remainder = jobs.slice(MAX_JOBS_TO_RANK).map(j => ({ ...j, fitScore: null }));

    const ranked = [];
    for (const job of toRank) {
      try {
        const jobEmbedding = await embedText(`${job.title}. ${job.description}`);
        ranked.push({ ...job, fitScore: Math.round(cosineSimilarity(candidate.embedding, jobEmbedding) * 100) });
      } catch (embedErr) {
        console.error(`Failed to embed job posting "${job.title}":`, embedErr);
        ranked.push({ ...job, fitScore: null });
      }
    }
    ranked.sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));

    return NextResponse.json({
      success: true,
      jobs: [...ranked, ...remainder],
      ranked: true,
      rankedAgainst: candidate.candidateName
    });
  } catch (error) {
    console.error('Job search route failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
