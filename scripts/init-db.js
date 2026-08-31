/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");

const url = (process.env.DATABASE_URL || "").trim();

function shouldUseSsl(connectionString) {
  return /[?&]sslmode=require\b/i.test(connectionString);
}

if (!url) {
  if (process.env.RENDER) {
    console.error(
      "[init-db] DATABASE_URL vazia no Render. Conecte um Render Postgres ao Web Service: Environment -> Add -> From Database -> connection string.",
    );
    process.exit(1);
  }
  console.log("[init-db] sem DATABASE_URL - modo local em memoria");
  process.exit(0);
}

const pool = new Pool({
  connectionString: url,
  ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  await pool.query(`
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

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS votes_deleted_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE votes ADD COLUMN IF NOT EXISTS office TEXT NOT NULL DEFAULT 'presidente'`);
  await pool.query(`ALTER TABLE votes ADD COLUMN IF NOT EXISTS state_key TEXT`);
  await pool.query(`UPDATE votes SET office = 'presidente' WHERE office IS NULL OR office = ''`);
  await pool.query(`UPDATE votes SET state_key = CASE WHEN office = 'presidente' THEN 'BR' ELSE state END WHERE state_key IS NULL OR state_key = ''`);
  await pool.query(`ALTER TABLE votes ALTER COLUMN state_key SET NOT NULL`);
  await pool.query(`ALTER TABLE votes ALTER COLUMN state_key SET DEFAULT 'BR'`);
  await pool.query(`ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_pkey`);
  await pool.query(`ALTER TABLE votes ADD PRIMARY KEY (twitter_id, office, state_key)`);

  console.log("[init-db] Postgres pronto (users, votes, messages)");
  await pool.end();
}

main().catch((err) => {
  console.error("[init-db] falhou:", err.message);
  process.exit(1);
});