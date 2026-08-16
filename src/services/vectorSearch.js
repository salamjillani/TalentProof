// Brute-force cosine similarity over embeddings stored in the JSON DB.
// This is genuine retrieval, not a real vector database — a legitimate
// choice at the scale this project targets (hundreds of resumes), not
// thousands+. Both /api/resumes/search (RAG) and /api/resumes/similar
// (nearest-neighbor) share this same search, differing only in where
// the query vector comes from.

export function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Flattens every past screening session into a single list of candidates,
 * each annotated with its parent session's id/targetRole/date, keeping
 * only candidates that actually have a stored embedding (a resume whose
 * embedding generation failed at analyze-time is simply invisible here
 * until it's re-screened — it still exists in its session's results).
 * @param {object} db - the db.js service module
 */
export async function getAllCandidatesWithEmbeddings(db) {
  const sessions = await db.getResumeSessions();
  const candidates = [];
  for (const session of sessions) {
    for (const result of session.results || []) {
      if (Array.isArray(result.embedding) && result.embedding.length > 0) {
        candidates.push({
          ...result,
          sessionId: session.id,
          targetRole: session.targetRole,
          sessionDate: session.date
        });
      }
    }
  }
  return candidates;
}

/**
 * Ranks candidates by similarity to a query vector and returns the top K.
 * @param {number[]} queryVector
 * @param {Array} candidates - from getAllCandidatesWithEmbeddings()
 * @param {number} k
 * @param {string|null} excludeId - candidate id to omit (e.g. exclude self in "find similar")
 */
export function topKSimilar(queryVector, candidates, k = 5, excludeId = null) {
  return candidates
    .filter(c => c.id !== excludeId)
    .map(c => ({ ...c, similarity: cosineSimilarity(queryVector, c.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}
