import axios from 'axios';

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
