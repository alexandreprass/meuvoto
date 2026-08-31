const { Pool } = require("pg");

const url = (process.env.DATABASE_URL || "").trim();

if (!url) {
  if (process.env.RENDER) {
    console.error(
      "[init-db] DATABASE_URL vazia no Render. No Web Service, Environment → Add → From Database → connection string.",
    );
    process.exit(1);
  }
  console.log("[init-db] sem DATABASE_URL — modo local (arquivo JSON)");
  process.exit(0);
}

const pool = new Pool({
  connectionString: url,
  ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
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
  console.log("[init-db] Postgres pronto (users, votes, messages)");
  await pool.end();
}

main().catch((err) => {
  console.error("[init-db] falhou:", err.message);
  process.exit(1);
});
