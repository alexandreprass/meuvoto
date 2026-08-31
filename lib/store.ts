import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { Pool } from "pg";

export type UserRecord = {
  twitterId: string;
  username: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
  lastLoginAt: string;
};

export type VoteRecord = {
  twitterId: string;
  twitterUser: string | null;
  twitterName: string | null;
  candidateId: string;
  state: string;
  createdAt: string;
};

export type MessageRecord = {
  id: string;
  twitterId: string;
  username: string | null;
  name: string | null;
  candidateId: string | null;
  body: string;
  createdAt: string;
};

type JsonStore = {
  users: UserRecord[];
  votes: VoteRecord[];
  messages: MessageRecord[];
};

const DATA_PATH =
  process.env.VOTES_PATH ??
  join(process.env.DATA_DIR ?? join(process.cwd(), "data"), "app.json");
const LEGACY_VOTES = join(process.cwd(), "data", "votes.json");

const MAX_MESSAGES = 30;

let pool: Pool | null = null;
let schemaReady = false;
let fileQueue: Promise<unknown> = Promise.resolve();

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    if (process.env.RENDER) {
      throw new Error(
        "DATABASE_URL ausente. No Render: Environment → Add DATABASE_URL → From Database.",
      );
    }
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
      max: 4,
    });
  }
  return pool;
}

async function ensureSchema(db: Pool) {
  if (schemaReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      twitter_id TEXT PRIMARY KEY,
      username TEXT,
      name TEXT,
      email TEXT,
      image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS votes (
      twitter_id TEXT PRIMARY KEY,
      twitter_user TEXT,
      twitter_name TEXT,
      candidate_id TEXT NOT NULL,
      state TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      twitter_id TEXT NOT NULL,
      username TEXT,
      name TEXT,
      candidate_id TEXT,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);
  `);
  schemaReady = true;
}

function withFile<T>(fn: () => T): Promise<T> {
  const run = fileQueue.then(fn, fn);
  fileQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function emptyStore(): JsonStore {
  return { users: [], votes: [], messages: [] };
}

function readFileStore(): JsonStore {
  if (!existsSync(DATA_PATH)) {
    if (existsSync(LEGACY_VOTES)) {
      try {
        const legacy = JSON.parse(readFileSync(LEGACY_VOTES, "utf8")) as {
          votes?: VoteRecord[];
        };
        const store = emptyStore();
        store.votes = Array.isArray(legacy.votes) ? legacy.votes : [];
        writeFileStore(store);
        return store;
      } catch {
        return emptyStore();
      }
    }
    return emptyStore();
  }
  try {
    const parsed = JSON.parse(readFileSync(DATA_PATH, "utf8")) as Partial<JsonStore>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      votes: Array.isArray(parsed.votes) ? parsed.votes : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeFileStore(store: JsonStore) {
  const dir = dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${DATA_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
  renameSync(tmp, DATA_PATH);
}

function nowIso() {
  return new Date().toISOString();
}

export async function upsertUser(input: {
  twitterId: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}): Promise<void> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    await db.query(
      `INSERT INTO users (twitter_id, username, name, email, image, created_at, last_login_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
       ON CONFLICT (twitter_id) DO UPDATE SET
         username = COALESCE(EXCLUDED.username, users.username),
         name = COALESCE(EXCLUDED.name, users.name),
         email = COALESCE(EXCLUDED.email, users.email),
         image = COALESCE(EXCLUDED.image, users.image),
         last_login_at = NOW()`,
      [
        input.twitterId,
        input.username ?? null,
        input.name ?? null,
        input.email ?? null,
        input.image ?? null,
      ],
    );
    return;
  }

  await withFile(() => {
    const store = readFileStore();
    const existing = store.users.find((u) => u.twitterId === input.twitterId);
    const ts = nowIso();
    if (existing) {
      existing.username = input.username ?? existing.username;
      existing.name = input.name ?? existing.name;
      existing.email = input.email ?? existing.email;
      existing.image = input.image ?? existing.image;
      existing.lastLoginAt = ts;
    } else {
      store.users.push({
        twitterId: input.twitterId,
        username: input.username ?? null,
        name: input.name ?? null,
        email: input.email ?? null,
        image: input.image ?? null,
        createdAt: ts,
        lastLoginAt: ts,
      });
    }
    writeFileStore(store);
  });
}

export async function listVotes(): Promise<VoteRecord[]> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const { rows } = await db.query<{
      twitter_id: string;
      twitter_user: string | null;
      twitter_name: string | null;
      candidate_id: string;
      state: string;
      created_at: Date;
    }>(
      `SELECT twitter_id, twitter_user, twitter_name, candidate_id, state, created_at FROM votes`,
    );
    return rows.map((r) => ({
      twitterId: r.twitter_id,
      twitterUser: r.twitter_user,
      twitterName: r.twitter_name,
      candidateId: r.candidate_id,
      state: r.state,
      createdAt: r.created_at.toISOString(),
    }));
  }
  return withFile(() => readFileStore().votes);
}

export async function findVote(twitterId: string): Promise<VoteRecord | null> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const { rows } = await db.query<{
      twitter_id: string;
      twitter_user: string | null;
      twitter_name: string | null;
      candidate_id: string;
      state: string;
      created_at: Date;
    }>(
      `SELECT twitter_id, twitter_user, twitter_name, candidate_id, state, created_at
       FROM votes WHERE twitter_id = $1`,
      [twitterId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      twitterId: r.twitter_id,
      twitterUser: r.twitter_user,
      twitterName: r.twitter_name,
      candidateId: r.candidate_id,
      state: r.state,
      createdAt: r.created_at.toISOString(),
    };
  }
  return withFile(
    () => readFileStore().votes.find((v) => v.twitterId === twitterId) ?? null,
  );
}

export async function createVote(
  vote: Omit<VoteRecord, "createdAt"> & { createdAt?: string },
): Promise<{ ok: true } | { ok: false; existing: VoteRecord }> {
  await upsertUser({
    twitterId: vote.twitterId,
    username: vote.twitterUser,
    name: vote.twitterName,
  });

  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const existing = await findVote(vote.twitterId);
    if (existing) return { ok: false, existing };
    await db.query(
      `INSERT INTO votes (twitter_id, twitter_user, twitter_name, candidate_id, state, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())`,
      [
        vote.twitterId,
        vote.twitterUser,
        vote.twitterName,
        vote.candidateId,
        vote.state,
      ],
    );
    return { ok: true };
  }

  return withFile(() => {
    const store = readFileStore();
    const existing = store.votes.find((v) => v.twitterId === vote.twitterId);
    if (existing) return { ok: false as const, existing };
    store.votes.push({
      ...vote,
      createdAt: vote.createdAt ?? nowIso(),
    });
    writeFileStore(store);
    return { ok: true as const };
  });
}

export async function listMessages(): Promise<MessageRecord[]> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const { rows } = await db.query<{
      id: string;
      twitter_id: string;
      username: string | null;
      name: string | null;
      candidate_id: string | null;
      body: string;
      created_at: Date;
    }>(
      `SELECT id, twitter_id, username, name, candidate_id, body, created_at
       FROM messages ORDER BY created_at ASC
       LIMIT $1`,
      [MAX_MESSAGES],
    );
    return rows.map((r) => ({
      id: r.id,
      twitterId: r.twitter_id,
      username: r.username,
      name: r.name,
      candidateId: r.candidate_id,
      body: r.body,
      createdAt: r.created_at.toISOString(),
    }));
  }
  return withFile(() => {
    const msgs = readFileStore().messages;
    return msgs.slice(-MAX_MESSAGES);
  });
}

export async function addMessage(input: {
  twitterId: string;
  username: string | null;
  name: string | null;
  candidateId: string | null;
  body: string;
}): Promise<MessageRecord> {
  const message: MessageRecord = {
    id: randomUUID(),
    twitterId: input.twitterId,
    username: input.username,
    name: input.name,
    candidateId: input.candidateId,
    body: input.body,
    createdAt: nowIso(),
  };

  const db = getPool();
  if (db) {
    await ensureSchema(db);
    await db.query(
      `INSERT INTO messages (id, twitter_id, username, name, candidate_id, body, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [
        message.id,
        message.twitterId,
        message.username,
        message.name,
        message.candidateId,
        message.body,
      ],
    );
    await db.query(
      `DELETE FROM messages WHERE id IN (
         SELECT id FROM (
           SELECT id FROM messages ORDER BY created_at DESC OFFSET $1
         ) old_messages
       )`,
      [MAX_MESSAGES],
    );
    return message;
  }

  return withFile(() => {
    const store = readFileStore();
    store.messages.push(message);
    store.messages = store.messages.slice(-MAX_MESSAGES);
    writeFileStore(store);
    return message;
  });
}
