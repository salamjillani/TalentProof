const fs = require('fs');
const path = require('path');
const os = require('os');

function checkWritable() {
  try {
    const testFile = path.join(process.cwd(), '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (e) {
    return false;
  }
}

const isWritable = checkWritable();
const baseDir = isWritable ? process.cwd() : os.tmpdir();
const DB_DIR = path.join(baseDir, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const UPLOADS_DIR = path.join(baseDir, 'uploads');

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const EMPTY_DB = { resumeSessions: [], conversions: [], summarySessions: [], jobPostings: [], applications: [] };

let inMemoryDb = { ...EMPTY_DB };
let useInMemory = !isWritable;

// Raw string get/set/delete against Upstash Redis's REST API. Used both for
// the single JSON db blob below and for binary file storage (base64-encoded)
// by routes that need to persist uploaded/converted files when the
// filesystem is read-only (serverless).
async function kvGetRaw(key) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    if (!res.ok) return null;
    const { result } = await res.json();
    return result;
  } catch (err) {
    console.warn(`Upstash GET failed for ${key}:`, err.message);
    return null;
  }
}

async function kvSetRaw(key, value) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return false;
  try {
    const res = await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      body: value,
    });
    return res.ok;
  } catch (err) {
    console.error(`Upstash SET failed for ${key}:`, err.message);
    return false;
  }
}

async function kvDeleteRaw(key) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return false;
  try {
    const res = await fetch(`${UPSTASH_URL}/del/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    return res.ok;
  } catch (err) {
    console.error(`Upstash DEL failed for ${key}:`, err.message);
    return false;
  }
}

// Ensure database directory and file exist
function initDb() {
  if (useInMemory) return;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2), 'utf8');
    }
  } catch (error) {
    console.error('Failed to initialize file DB, switching to in-memory:', error);
    useInMemory = true;
  }
}

// Every serverless function invocation may land on a different instance
// with its own module-level `inMemoryDb`, so a request that only reads a
// stale local cache can miss data another instance already wrote to
// Upstash moments earlier (this was the cause of "job posting no longer
// exists" on a job that had just been created). Always await the real
// fetch here instead of firing it in the background, so every read
// reflects the latest known state, not whatever this instance happened
// to have cached.
async function readDb() {
  if (useInMemory) {
    if (!isWritable) {
      const raw = await kvGetRaw('db_json');
      if (raw) {
        try {
          inMemoryDb = JSON.parse(raw);
        } catch (err) {
          console.warn('Failed to parse DB from Upstash, using last known state:', err.message);
        }
      }
    }
    return inMemoryDb;
  }
  initDb();
  if (useInMemory) return inMemoryDb;
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DB, resetting...', error);
    return { ...EMPTY_DB };
  }
}

async function writeDb(data) {
  if (useInMemory) {
    inMemoryDb = data;
    if (!isWritable) {
      await kvSetRaw('db_json', JSON.stringify(data));
    }
    return;
  }
  initDb();
  if (useInMemory) {
    inMemoryDb = data;
    return;
  }
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write to file DB, switching to in-memory:', error);
    useInMemory = true;
    inMemoryDb = data;
  }
}

module.exports = {
  getResumeSessions: async () => {
    const db = await readDb();
    return db.resumeSessions || [];
  },

  saveResumeSession: async (session) => {
    const db = await readDb();
    if (!db.resumeSessions) db.resumeSessions = [];
    db.resumeSessions.push(session);
    await writeDb(db);
    return session;
  },

  deleteResumeSession: async (id) => {
    const db = await readDb();
    if (!db.resumeSessions) return false;
    db.resumeSessions = db.resumeSessions.filter(s => s.id !== id);
    await writeDb(db);
    return true;
  },

  // Finds a single candidate result by its id across every past session.
  // Returns the candidate annotated with its parent session's id/targetRole/date,
  // or null if not found. Used by the "Find Similar Candidates" feature.
  findCandidateById: async (id) => {
    const db = await readDb();
    const sessions = db.resumeSessions || [];
    for (const session of sessions) {
      const candidate = (session.results || []).find(r => r.id === id);
      if (candidate) {
        return {
          ...candidate,
          sessionId: session.id,
          targetRole: session.targetRole,
          sessionDate: session.date
        };
      }
    }
    return null;
  },

  getConversions: async () => {
    const db = await readDb();
    return db.conversions || [];
  },

  saveConversion: async (conversion) => {
    const db = await readDb();
    if (!db.conversions) db.conversions = [];
    db.conversions.push(conversion);
    await writeDb(db);
    return conversion;
  },

  deleteConversion: async (id) => {
    const db = await readDb();
    if (!db.conversions) return false;
    db.conversions = db.conversions.filter(c => c.id !== id);
    await writeDb(db);
    return true;
  },

  getSummarySessions: async () => {
    const db = await readDb();
    return db.summarySessions || [];
  },

  getSummarySession: async (id) => {
    const db = await readDb();
    return (db.summarySessions || []).find(s => s.id === id) || null;
  },

  saveSummarySession: async (session) => {
    const db = await readDb();
    if (!db.summarySessions) db.summarySessions = [];
    db.summarySessions.push(session);
    await writeDb(db);
    return session;
  },

  deleteSummarySession: async (id) => {
    const db = await readDb();
    if (!db.summarySessions) return false;
    db.summarySessions = db.summarySessions.filter(s => s.id !== id);
    await writeDb(db);
    return true;
  },

  // ---------- Job Postings (public apply links) ----------
  getJobPostings: async () => {
    const db = await readDb();
    return db.jobPostings || [];
  },

  getJobPosting: async (id) => {
    const db = await readDb();
    return (db.jobPostings || []).find(j => j.id === id) || null;
  },

  saveJobPosting: async (posting) => {
    const db = await readDb();
    if (!db.jobPostings) db.jobPostings = [];
    db.jobPostings.push(posting);
    await writeDb(db);
    return posting;
  },

  deleteJobPosting: async (id) => {
    const db = await readDb();
    if (!db.jobPostings) return false;
    db.jobPostings = db.jobPostings.filter(j => j.id !== id);
    await writeDb(db);
    return true;
  },

  // ---------- Applications (candidates who applied through a job posting) ----------
  getApplications: async (jobPostingId = null) => {
    const db = await readDb();
    const applications = db.applications || [];
    return jobPostingId ? applications.filter(a => a.jobPostingId === jobPostingId) : applications;
  },

  getApplication: async (id) => {
    const db = await readDb();
    return (db.applications || []).find(a => a.id === id) || null;
  },

  saveApplication: async (application) => {
    const db = await readDb();
    if (!db.applications) db.applications = [];
    db.applications.push(application);
    await writeDb(db);
    return application;
  },

  updateApplication: async (id, updates) => {
    const db = await readDb();
    if (!db.applications) return null;
    const app = db.applications.find(a => a.id === id);
    if (!app) return null;
    Object.assign(app, updates);
    await writeDb(db);
    return app;
  },

  deleteApplication: async (id) => {
    const db = await readDb();
    if (!db.applications) return false;
    db.applications = db.applications.filter(a => a.id !== id);
    await writeDb(db);
    return true;
  },

  // ---------- Binary file storage (converted documents) ----------
  // Local disk when writable; base64-encoded through the same Upstash
  // Redis store as the JSON db otherwise. Files are namespaced under
  // `file_` so they don't collide with the `db_json` key.
  saveFile: async (key, buffer) => {
    return kvSetRaw(`file_${key}`, buffer.toString('base64'));
  },

  getFile: async (key) => {
    const b64 = await kvGetRaw(`file_${key}`);
    return b64 ? Buffer.from(b64, 'base64') : null;
  },

  deleteFile: async (key) => {
    return kvDeleteRaw(`file_${key}`);
  },

  getUploadsDir: () => {
    return UPLOADS_DIR;
  },

  isWritable: () => {
    return isWritable;
  }
};
