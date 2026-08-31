import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";

export type VoteRecord = {
  twitterId: string;
  twitterUser: string | null;
  twitterName: string | null;
  candidateId: string;
  state: string;
  createdAt: string;
};

type StoreFile = {
  votes: VoteRecord[];
};

const DATA_PATH =
  process.env.VOTES_PATH ??
  join(process.env.DATA_DIR ?? join(process.cwd(), "data"), "votes.json");

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => T): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function readStore(): StoreFile {
  if (!existsSync(DATA_PATH)) {
    return { votes: [] };
  }
  try {
    const raw = readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (!Array.isArray(parsed.votes)) return { votes: [] };
    return parsed;
  } catch {
    return { votes: [] };
  }
}

function writeStore(store: StoreFile) {
  const dir = dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${DATA_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
  renameSync(tmp, DATA_PATH);
}

export async function listVotes(): Promise<VoteRecord[]> {
  return withLock(() => readStore().votes);
}

export async function findVote(twitterId: string): Promise<VoteRecord | null> {
  return withLock(() => readStore().votes.find((v) => v.twitterId === twitterId) ?? null);
}

export async function createVote(
  vote: Omit<VoteRecord, "createdAt"> & { createdAt?: string },
): Promise<{ ok: true } | { ok: false; existing: VoteRecord }> {
  return withLock(() => {
    const store = readStore();
    const existing = store.votes.find((v) => v.twitterId === vote.twitterId);
    if (existing) return { ok: false as const, existing };
    store.votes.push({
      ...vote,
      createdAt: vote.createdAt ?? new Date().toISOString(),
    });
    writeStore(store);
    return { ok: true as const };
  });
}
