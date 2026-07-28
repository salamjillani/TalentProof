import { pipeline, env } from '@huggingface/transformers';

// On Vercel (and most serverless hosts), only /tmp is writable — the
// library's default cache dir (./.cache, relative to the module) would
// fail there. /tmp is wiped between cold starts, so the ~90MB model
// re-downloads on the first request after each one; that's an accepted
// latency tradeoff for staying serverless-compatible, not a bug.
if (process.env.VERCEL) {
  env.cacheDir = '/tmp/transformers-cache';
}

// The embedding model has an effective ~256-token context window, so only
// roughly the first ~1500-2000 characters of a resume meaningfully shape
// its embedding. Acceptable at the hundreds-of-resumes scale this project
// targets, but worth knowing: a candidate's most recent role dominates the
// vector more than, say, education listed at the bottom of the document.
const MAX_CHARS = 2000;
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

let extractorPromise = null;

function getExtractor() {
  // Singleton so the ~90MB model is downloaded/loaded once per server
  // process, not on every embedding call.
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_ID);
  }
  return extractorPromise;
}

/**
 * Generates a 384-dimensional embedding for a piece of text, entirely
 * locally (no API key, no network call). Runs a real trained sentence
 * embedding model in-process, same architectural role as tesseract.js
 * for OCR: a genuine local model, not a heuristic stand-in.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  const extractor = await getExtractor();
  const capped = (text || '').slice(0, MAX_CHARS);
  const output = await extractor(capped, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
