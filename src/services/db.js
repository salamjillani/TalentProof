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

const BUCKET = process.env.KVDB_BUCKET_ID || 'talentproof_9f3a7c1e';
const KV_URL = `https://kvdb.io/${BUCKET}`;

let inMemoryDb = { resumeSessions: [], conversions: [], summarySessions: [] };
let useInMemory = !isWritable;

if (!isWritable) {
  // Fetch initial database state on startup
  fetch(`${KV_URL}/db_json`)
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Not found');
    })
    .then(data => {
      if (data && typeof data === 'object') {
        inMemoryDb = data;
        console.log('Successfully loaded DB from kvdb.io');
      }
    })
    .catch(err => {
      console.warn('Failed to load initial DB from kvdb.io, using default empty DB:', err.message);
    });
}

// Ensure database directory and file exist
function initDb() {
  if (useInMemory) return;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify({ resumeSessions: [], conversions: [], summarySessions: [] }, null, 2),
        'utf8'
      );
    }
  } catch (error) {
    console.error('Failed to initialize file DB, switching to in-memory:', error);
    useInMemory = true;
  }
}

function readDb() {
  if (useInMemory) {
    if (!isWritable) {
      // Sync from kvdb in background
      fetch(`${KV_URL}/db_json`)
        .then(res => {
          if (res.ok) return res.json();
        })
        .then(data => {
          if (data) inMemoryDb = data;
        })
        .catch(() => { });
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
    return { resumeSessions: [], conversions: [], summarySessions: [] };
  }
}

function writeDb(data) {
  if (useInMemory) {
    inMemoryDb = data;
    if (!isWritable) {
      fetch(`${KV_URL}/db_json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(err => console.error('Failed to sync DB write to kvdb.io:', err));
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
  getResumeSessions: () => {
    const db = readDb();
    return db.resumeSessions || [];
  },

  saveResumeSession: (session) => {
    const db = readDb();
    if (!db.resumeSessions) db.resumeSessions = [];
    db.resumeSessions.push(session);
    writeDb(db);
    return session;
  },

  deleteResumeSession: (id) => {
    const db = readDb();
    if (!db.resumeSessions) return false;
    db.resumeSessions = db.resumeSessions.filter(s => s.id !== id);
    writeDb(db);
    return true;
  },

  // Finds a single candidate result by its id across every past session.
  // Returns the candidate annotated with its parent session's id/targetRole/date,
  // or null if not found. Used by the "Find Similar Candidates" feature.
  findCandidateById: (id) => {
    const db = readDb();
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

  getConversions: () => {
    const db = readDb();
    return db.conversions || [];
  },

  saveConversion: (conversion) => {
    const db = readDb();
    if (!db.conversions) db.conversions = [];
    db.conversions.push(conversion);
    writeDb(db);
    return conversion;
  },

  deleteConversion: (id) => {
    const db = readDb();
    if (!db.conversions) return false;
    db.conversions = db.conversions.filter(c => c.id !== id);
    writeDb(db);
    return true;
  },

  getSummarySessions: () => {
    const db = readDb();
    return db.summarySessions || [];
  },

  getSummarySession: (id) => {
    const db = readDb();
    return (db.summarySessions || []).find(s => s.id === id) || null;
  },

  saveSummarySession: (session) => {
    const db = readDb();
    if (!db.summarySessions) db.summarySessions = [];
    db.summarySessions.push(session);
    writeDb(db);
    return session;
  },

  deleteSummarySession: (id) => {
    const db = readDb();
    if (!db.summarySessions) return false;
    db.summarySessions = db.summarySessions.filter(s => s.id !== id);
    writeDb(db);
    return true;
  },

  getUploadsDir: () => {
    return UPLOADS_DIR;
  },

  getBucketId: () => {
    return BUCKET;
  },

  isWritable: () => {
    return isWritable;
  }
};
