import axios from 'axios';
import { embedText } from './embeddingService';
import { cosineSimilarity } from './vectorSearch';

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';

// Adzuna aggregates real listings from thousands of job boards and company
// career sites, but it does not index Pakistan directly. Supported country
// codes: gb, us, au, ca, de, fr, in, it, nl, nz, pl, sg, za, mx, br, at, ru.
// Defaulting to India ('in') as the closest regional market with heavy
// remote/tech listings; callers can override via the `country` param.
const DEFAULT_COUNTRY = process.env.ADZUNA_COUNTRY || 'in';

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').trim();
}

/**
 * Searches real, live job postings via the Adzuna API. No local/fake
 * fallback: if the API key is missing or the request fails, this throws
 * and the caller must surface a real error, never a synthesized result.
 */
export async function searchJobs({ role, location = '', country = DEFAULT_COUNTRY, page = 1, resultsPerPage = 20 }) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error('Job search is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in environment variables (free keys at developer.adzuna.com).');
  }
  if (!role || !role.trim()) {
    throw new Error('A job role or keyword is required to search.');
  }

  const url = `${ADZUNA_BASE}/${country}/search/${page}`;
  const response = await axios.get(url, {
    params: {
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: resultsPerPage,
      what: role,
      where: location || undefined,
      sort_by: 'date'
    }
  });

  const results = response.data.results || [];
  return results.map(job => ({
    id: String(job.id),
    title: stripHtml(job.title) || 'Untitled role',
    company: job.company?.display_name || 'Unknown company',
    location: job.location?.display_name || location || 'Not specified',
    description: stripHtml(job.description),
    salaryMin: job.salary_min || null,
    salaryMax: job.salary_max || null,
    url: job.redirect_url,
    created: job.created,
    category: job.category?.label || null
  }));
}

// Cap on how many real postings get embedded+ranked per call, to bound
// latency (each is a local model call, not free of cost in time).
const MAX_JOBS_TO_RANK = 20;

/**
 * Re-ranks a list of real job postings by semantic fit against a resume
 * embedding, by embedding each posting's title+description and comparing
 * via cosine similarity. Shared by both the recruiter "rank by candidate"
 * flow and the job-seeker self-service flow — the math is identical,
 * only where the embedding comes from differs.
 * @param {Array} jobs - result of searchJobs()
 * @param {number[]} resumeEmbedding
 */
export async function rankJobsByFit(jobs, resumeEmbedding) {
  const toRank = jobs.slice(0, MAX_JOBS_TO_RANK);
  const remainder = jobs.slice(MAX_JOBS_TO_RANK).map(j => ({ ...j, fitScore: null }));

  const ranked = [];
  for (const job of toRank) {
    try {
      const jobEmbedding = await embedText(`${job.title}. ${job.description}`);
      ranked.push({ ...job, fitScore: Math.round(cosineSimilarity(resumeEmbedding, jobEmbedding) * 100) });
    } catch (embedErr) {
      console.error(`Failed to embed job posting "${job.title}":`, embedErr);
      ranked.push({ ...job, fitScore: null });
    }
  }
  ranked.sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));

  return [...ranked, ...remainder];
}
