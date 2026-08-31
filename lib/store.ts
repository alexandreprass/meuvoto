import { randomUUID } from "crypto";
import { Pool } from "pg";
import { voteScope, type OfficeId } from "./offices";

export type UserRecord = {
  twitterId: string;
  username: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
  lastLoginAt: string;
  blockedAt: string | null;
  state: string | null;
};

export type VoteRecord = {
  twitterId: string;
  twitterUser: string | null;
  twitterName: string | null;
  office: OfficeId;
  candidateId: string;
  state: string;
  stateKey: string;
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

type MemoryStore = {
  users: UserRecord[];
  votes: VoteRecord[];
  messages: MessageRecord[];
};

const MAX_MESSAGES = 30;
const memory: MemoryStore = { users: [], votes: [], messages: [] };

let pool: Pool | null = null;
let schemaReady = false;

function shouldUseSsl(url: string) {
  return /[?&]sslmode=require\b/i.test(url);
}

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    if (process.env.RENDER) {
      throw new Error(
        "DATABASE_URL ausente no Render. Conecte um Render Postgres ao Web Service em Environment -> Add -> From Database -> connection string.",
      );
    }
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
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
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      blocked_at TIMESTAMPTZ,
      state TEXT,
      votes_deleted_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS votes (
      twitter_id TEXT NOT NULL,
      twitter_user TEXT,
      twitter_name TEXT,
      office TEXT NOT NULL DEFAULT 'presidente',
      candidate_id TEXT NOT NULL,
      state TEXT NOT NULL,
      state_key TEXT NOT NULL DEFAULT 'BR',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (twitter_id, office, state_key)
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

  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS votes_deleted_at TIMESTAMPTZ`);
  await db.query(`ALTER TABLE votes ADD COLUMN IF NOT EXISTS office TEXT NOT NULL DEFAULT 'presidente'`);
  await db.query(`ALTER TABLE votes ADD COLUMN IF NOT EXISTS state_key TEXT`);
  await db.query(`UPDATE votes SET office = 'presidente' WHERE office IS NULL OR office = ''`);
  await db.query(`UPDATE votes SET state_key = CASE WHEN office = 'presidente' THEN 'BR' ELSE state END WHERE state_key IS NULL OR state_key = ''`);
  await db.query(`ALTER TABLE votes ALTER COLUMN state_key SET NOT NULL`);
  await db.query(`ALTER TABLE votes ALTER COLUMN state_key SET DEFAULT 'BR'`);
  await db.query(`ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_pkey`);
  await db.query(`ALTER TABLE votes ADD PRIMARY KEY (twitter_id, office, state_key)`);

  schemaReady = true;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeVote(row: {
  twitter_id: string;
  twitter_user: string | null;
  twitter_name: string | null;
  office: string | null;
  candidate_id: string;
  state: string;
  state_key: string | null;
  created_at: Date;
}): VoteRecord {
  const office: OfficeId =
    row.office === "senador" || row.office === "deputado_federal" || row.office === "deputado_estadual"
      ? row.office
      : "presidente";
  return {
    twitterId: row.twitter_id,
    twitterUser: row.twitter_user,
    twitterName: row.twitter_name,
    office,
    candidateId: row.candidate_id,
    state: row.state,
    stateKey: row.state_key ?? voteScope(office, row.state),
    createdAt: row.created_at.toISOString(),
  };
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

  const existing = memory.users.find((u) => u.twitterId === input.twitterId);
  const ts = nowIso();
  if (existing) {
    existing.username = input.username ?? existing.username;
    existing.name = input.name ?? existing.name;
    existing.email = input.email ?? existing.email;
    existing.image = input.image ?? existing.image;
    existing.lastLoginAt = ts;
  } else {
    memory.users.push({
      twitterId: input.twitterId,
      username: input.username ?? null,
      name: input.name ?? null,
      email: input.email ?? null,
      image: input.image ?? null,
      createdAt: ts,
      lastLoginAt: ts,
      blockedAt: null,
      state: null,
    });
  }
}

export async function listVotes(office?: OfficeId): Promise<VoteRecord[]> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const params = office ? [office] : [];
    const { rows } = await db.query<{
      twitter_id: string;
      twitter_user: string | null;
      twitter_name: string | null;
      office: string | null;
      candidate_id: string;
      state: string;
      state_key: string | null;
      created_at: Date;
    }>(
      `SELECT twitter_id, twitter_user, twitter_name, office, candidate_id, state, state_key, created_at
       FROM votes ${office ? "WHERE office = $1" : ""}`,
      params,
    );
    return rows.map(normalizeVote);
  }
  return office ? memory.votes.filter((v) => v.office === office) : memory.votes;
}

export async function listUserVotes(twitterId: string): Promise<VoteRecord[]> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const { rows } = await db.query<{
      twitter_id: string;
      twitter_user: string | null;
      twitter_name: string | null;
      office: string | null;
      candidate_id: string;
      state: string;
      state_key: string | null;
      created_at: Date;
    }>(
      `SELECT twitter_id, twitter_user, twitter_name, office, candidate_id, state, state_key, created_at
       FROM votes WHERE twitter_id = $1 ORDER BY created_at ASC`,
      [twitterId],
    );
    return rows.map(normalizeVote);
  }
  return memory.votes.filter((v) => v.twitterId === twitterId);
}

export async function findVote(
  twitterId: string,
  office: OfficeId = "presidente",
  stateKey = "BR",
): Promise<VoteRecord | null> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const { rows } = await db.query<{
      twitter_id: string;
      twitter_user: string | null;
      twitter_name: string | null;
      office: string | null;
      candidate_id: string;
      state: string;
      state_key: string | null;
      created_at: Date;
    }>(
      `SELECT twitter_id, twitter_user, twitter_name, office, candidate_id, state, state_key, created_at
       FROM votes WHERE twitter_id = $1 AND office = $2 AND state_key = $3`,
      [twitterId, office, stateKey],
    );
    const row = rows[0];
    return row ? normalizeVote(row) : null;
  }
  return (
    memory.votes.find(
      (v) => v.twitterId === twitterId && v.office === office && v.stateKey === stateKey,
    ) ?? null
  );
}

export async function createVote(
  vote: Omit<VoteRecord, "createdAt" | "stateKey"> & {
    createdAt?: string;
    stateKey?: string;
  },
): Promise<{ ok: true } | { ok: false; existing: VoteRecord }> {
  const stateKey = vote.stateKey ?? voteScope(vote.office, vote.state);

  await upsertUser({
    twitterId: vote.twitterId,
    username: vote.twitterUser,
    name: vote.twitterName,
  });

  const existing = await findVote(vote.twitterId, vote.office, stateKey);
  if (existing) return { ok: false, existing };

  const db = getPool();
  if (db) {
    await ensureSchema(db);
    await db.query(
      `INSERT INTO votes (twitter_id, twitter_user, twitter_name, office, candidate_id, state, state_key, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [
        vote.twitterId,
        vote.twitterUser,
        vote.twitterName,
        vote.office,
        vote.candidateId,
        vote.state,
        stateKey,
      ],
    );
    return { ok: true };
  }

  memory.votes.push({
    ...vote,
    stateKey,
    createdAt: vote.createdAt ?? nowIso(),
  });
  return { ok: true };
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
  return memory.messages.slice(-MAX_MESSAGES);
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

  memory.messages.push(message);
  memory.messages = memory.messages.slice(-MAX_MESSAGES);
  return message;
}

export type AdminUserRecord = UserRecord & { votes: VoteRecord[] };

export async function isUserBlocked(twitterId: string): Promise<boolean> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const { rows } = await db.query<{ blocked_at: Date | null }>(
      "SELECT blocked_at FROM users WHERE twitter_id = $1",
      [twitterId],
    );
    return Boolean(rows[0]?.blocked_at);
  }
  return Boolean(memory.users.find((user) => user.twitterId === twitterId)?.blockedAt);
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const [{ rows: users }, votes] = await Promise.all([
      db.query<{
        twitter_id: string; username: string | null; name: string | null; email: string | null;
        image: string | null; created_at: Date; last_login_at: Date; blocked_at: Date | null; state: string | null;
      }>("SELECT twitter_id, username, name, email, image, created_at, last_login_at, blocked_at, state FROM users ORDER BY last_login_at DESC"),
      listVotes(),
    ]);
    return users.map((user) => ({
      twitterId: user.twitter_id,
      username: user.username,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.created_at.toISOString(),
      lastLoginAt: user.last_login_at.toISOString(),
      blockedAt: user.blocked_at?.toISOString() ?? null,
      state: user.state,
      votes: votes.filter((vote) => vote.twitterId === user.twitter_id),
    }));
  }
  return memory.users.map((user) => ({
    ...user,
    votes: memory.votes.filter((vote) => vote.twitterId === user.twitterId),
  }));
}

export async function deleteAdminVotes(keys: Array<{ twitterId: string; office: OfficeId; stateKey: string }>) {
  if (keys.length === 0) return;
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      for (const key of keys) {
        await client.query(
          "DELETE FROM votes WHERE twitter_id = $1 AND office = $2 AND state_key = $3",
          [key.twitterId, key.office, key.stateKey],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return;
  }
  memory.votes = memory.votes.filter(
    (vote) => !keys.some((key) => key.twitterId === vote.twitterId && key.office === vote.office && key.stateKey === vote.stateKey),
  );
}

export async function setUsersBlocked(twitterIds: string[], blocked: boolean) {
  if (twitterIds.length === 0) return;
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    await db.query(
      "UPDATE users SET blocked_at = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE twitter_id = ANY($1::text[])",
      [twitterIds, blocked],
    );
    return;
  }
  for (const user of memory.users) {
    if (twitterIds.includes(user.twitterId)) user.blockedAt = blocked ? nowIso() : null;
  }
}

export async function deleteAdminUsers(twitterIds: string[]) {
  if (twitterIds.length === 0) return;
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM messages WHERE twitter_id = ANY($1::text[])", [twitterIds]);
      await client.query("DELETE FROM votes WHERE twitter_id = ANY($1::text[])", [twitterIds]);
      await client.query("DELETE FROM users WHERE twitter_id = ANY($1::text[])", [twitterIds]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return;
  }
  memory.messages = memory.messages.filter((message) => !twitterIds.includes(message.twitterId));
  memory.votes = memory.votes.filter((vote) => !twitterIds.includes(vote.twitterId));
  memory.users = memory.users.filter((user) => !twitterIds.includes(user.twitterId));
}


export async function getUserState(twitterId: string): Promise<string | null> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const { rows } = await db.query<{ state: string | null }>("SELECT state FROM users WHERE twitter_id = $1", [twitterId]);
    if (rows[0]?.state) return rows[0].state;
    const votes = await listUserVotes(twitterId);
    return votes[0]?.state ?? null;
  }
  const user = memory.users.find((item) => item.twitterId === twitterId);
  return user?.state ?? memory.votes.find((vote) => vote.twitterId === twitterId)?.state ?? null;
}

export async function setUserState(twitterId: string, state: string) {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    await db.query("UPDATE users SET state = $2 WHERE twitter_id = $1", [twitterId, state]);
    return;
  }
  const user = memory.users.find((item) => item.twitterId === twitterId);
  if (user) user.state = state;
}


export async function canUserDeleteVotes(twitterId: string): Promise<boolean> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const { rows } = await db.query<{ votes_deleted_at: Date | null }>(
      "SELECT votes_deleted_at FROM users WHERE twitter_id = $1",
      [twitterId],
    );
    return !rows[0]?.votes_deleted_at;
  }
  const user = memory.users.find((item) => item.twitterId === twitterId) as (UserRecord & { votesDeletedAt?: string | null }) | undefined;
  return !user?.votesDeletedAt;
}

export async function deleteOwnVotesOnce(twitterId: string): Promise<boolean> {
  const db = getPool();
  if (db) {
    await ensureSchema(db);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const { rowCount } = await client.query(
        "UPDATE users SET votes_deleted_at = NOW() WHERE twitter_id = $1 AND votes_deleted_at IS NULL",
        [twitterId],
      );
      if (!rowCount) {
        await client.query("ROLLBACK");
        return false;
      }
      await client.query("DELETE FROM votes WHERE twitter_id = $1", [twitterId]);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  const user = memory.users.find((item) => item.twitterId === twitterId) as (UserRecord & { votesDeletedAt?: string | null }) | undefined;
  if (!user || user.votesDeletedAt) return false;
  user.votesDeletedAt = nowIso();
  memory.votes = memory.votes.filter((vote) => vote.twitterId !== twitterId);
  return true;
}
