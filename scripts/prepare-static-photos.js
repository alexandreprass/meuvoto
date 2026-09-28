const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "public", "candidate-data");
const photoDir = path.join(root, "public", "candidate-photos");
const photoUrl = /\/arquivo\/img\/\d+\/(\d+)\/([A-Z]{2})$/;
const zipName = /^F[A-Z]{2}(\d+)_div\.(jpe?g|png)$/i;
const zipUrl = (uf) =>
  `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_${uf}_div.zip`;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function neededPhotos() {
  const byUf = new Map();
  for (const file of walk(dataDir).filter((item) => item.endsWith(".json"))) {
    for (const candidate of JSON.parse(fs.readFileSync(file, "utf8"))) {
      const match = photoUrl.exec(candidate.photo ?? "");
      if (!match) continue;
      const [sq, uf] = [match[1], match[2]];
      if (!byUf.has(uf)) byUf.set(uf, new Set());
      byUf.get(uf).add(sq);
    }
  }
  return byUf;
}

function extractZip(buffer, dest) {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("arquivo zip inválido");
  const count = buffer.readUInt16LE(eocd + 10);
  if (count === 0xffff) throw new Error("zip64 não suportado");
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("índice do zip inválido");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    offset += 46 + nameLength + extraLength + commentLength;
    if (!name || name.endsWith("/")) continue;

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed) : null;
    if (!data) throw new Error(`foto compactada de um jeito não suportado: ${name}`);

    const outPath = path.resolve(dest, ...name.split("/").filter(Boolean));
    const relative = path.relative(dest, outPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`caminho inválido no zip: ${name}`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, data);
  }
}

async function downloadZip(uf) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(zipUrl(uf), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Referer: "https://dadosabertos.tse.jus.br/",
          Accept: "application/zip,*/*",
        },
        signal: AbortSignal.timeout(180000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1000) throw new Error(`arquivo pequeno demais (${bytes.length} bytes)`);
      return bytes;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

async function saveUf(uf, sqs) {
  const bytes = await downloadZip(uf);
  const tempDir = fs.mkdtempSync(path.join(fs.realpathSync(require("node:os").tmpdir()), "meuvoto-fotos-"));
  const saved = new Map();
  try {
    extractZip(bytes, tempDir);
    for (const file of walk(tempDir)) {
      const match = zipName.exec(path.basename(file));
      if (!match || !sqs.has(match[1]) || saved.has(match[1])) continue;
      const extension = path.extname(file).toLowerCase() === ".png" ? ".png" : ".jpg";
      const publicPath = `/candidate-photos/${match[1]}${extension}`;
      fs.copyFileSync(file, path.join(photoDir, `${match[1]}${extension}`));
      saved.set(match[1], publicPath);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  return saved;
}

async function mapPool(items, limit, task) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await task(item);
    }
  }));
}

async function main() {
  if (!fs.existsSync(dataDir)) {
    throw new Error("Rode scripts/prepare-static-candidates.js antes de baixar as fotos.");
  }
  const byUf = neededPhotos();
  const requested = [...byUf.values()].reduce((sum, sqs) => sum + sqs.size, 0);
  fs.mkdirSync(photoDir, { recursive: true });

  const saved = new Map();
  for (const file of fs.readdirSync(photoDir)) {
    const match = /^(\d+)\.(jpe?g|png)$/i.exec(file);
    if (match) saved.set(match[1], `/candidate-photos/${file}`);
  }
  const failures = [];
  const pending = [...byUf.entries()].filter(([, sqs]) => [...sqs].some((sq) => !saved.has(sq)));
  if (pending.length === 0) {
    console.log(`Fotos já salvas: ${saved.size}/${requested}.`);
  }
  await mapPool(pending, 4, async ([uf, sqs]) => {
    try {
      const photos = await saveUf(uf, sqs);
      for (const [sq, publicPath] of photos) saved.set(sq, publicPath);
      console.log(`${uf}: ${photos.size}/${sqs.size} fotos`);
    } catch (error) {
      failures.push(`${uf}: ${error instanceof Error ? error.message : error}`);
      console.error(`${uf}: falhou (${error instanceof Error ? error.message : error})`);
    }
  });

  let linked = 0;
  for (const file of walk(dataDir).filter((item) => item.endsWith(".json"))) {
    const candidates = JSON.parse(fs.readFileSync(file, "utf8"));
    let changed = false;
    for (const candidate of candidates) {
      const match = photoUrl.exec(candidate.photo ?? "");
      const publicPath = match ? saved.get(match[1]) : null;
      if (!publicPath) continue;
      candidate.photo = publicPath;
      changed = true;
      linked += 1;
    }
    if (changed) fs.writeFileSync(file, JSON.stringify(candidates));
  }

  console.log(`Fotos locais: ${saved.size}. Candidatos atualizados: ${linked}/${requested}.`);
  if (requested > 0 && linked < requested * 0.95) {
    throw new Error(failures.join("\n") || "Faltam fotos locais para a maioria dos candidatos.");
  }
  if (failures.length) console.error(failures.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
