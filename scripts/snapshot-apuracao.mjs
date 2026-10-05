import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://resultados.tse.jus.br/oficial/ele2026";
const ROOT = fileURLToPath(new URL("../public/apuracao/", import.meta.url));
const CACHE = fileURLToPath(new URL("../.apuracao-cache/", import.meta.url));
const onlyUf = (process.env.UF || "").toUpperCase();

const OFFICES = [
  { id: "presidente", ele: "6257", cargo: "0001", proportional: false, national: true },
  { id: "governador", ele: "6259", cargo: "0003", proportional: false, national: false },
  { id: "senador", ele: "6259", cargo: "0005", proportional: false, national: false },
  { id: "deputado_federal", ele: "6259", cargo: "0006", proportional: true, national: false },
  { id: "deputado_estadual", ele: "6259", cargo: "0007", proportional: true, national: false },
];

function cargoOf(office, uf) {
  return office.id === "deputado_estadual" && uf === "DF" ? "0008" : office.cargo;
}

function fileUrl(office, uf, cd) {
  const code = uf.toLowerCase();
  const ele = office.ele.padStart(6, "0");
  const cargo = cargoOf(office, uf);
  const name = cd ? `${code}${cd}-c${cargo}-e${ele}-u.json` : `${code}-c${cargo}-e${ele}-u.json`;
  return `${ORIGIN}/${office.ele}/dados/${code}/${name}`;
}

let pauseUntil = 0;
let nextSlot = 0;
let backoff = 20000;
let lastPauseLog = 0;
const GAP_MS = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pull(url) {
  let netFails = 0;
  for (;;) {
    const wait = Math.max(pauseUntil - Date.now(), nextSlot - Date.now(), 0);
    if (wait > 0) await sleep(wait);
    nextSlot = Date.now() + GAP_MS;
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(90000),
      });
      if (response.status === 429 || response.status === 503) {
        pauseUntil = Date.now() + backoff;
        if (Date.now() - lastPauseLog > 15000) {
          console.log(`pausa TSE ${Math.round(backoff / 1000)}s`);
          lastPauseLog = Date.now();
        }
        backoff = Math.min(backoff * 2, 90000);
        continue;
      }
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      backoff = 20000;
      return await response.json();
    } catch (error) {
      if (error instanceof Error && /404/.test(error.message)) throw error;
      netFails += 1;
      if (netFails >= 8) throw error;
      pauseUntil = Date.now() + 5000;
    }
  }
}

function num(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function andCode(value) {
  if (value === "f") return 2;
  if (value === "p") return 1;
  return 0;
}

function walk(json, proportional) {
  const candidates = [];
  const parties = [];
  for (const group of json?.carg?.[0]?.agr ?? []) {
    for (const party of group.par ?? []) {
      const sigla = String(party.sg ?? "").replace(/\*/g, "").trim() || String(party.n ?? "");
      let nominal = 0;
      for (const cand of party.cand ?? []) {
        const votos = num(cand.vap);
        nominal += votos;
        candidates.push({
          nome: String(cand.nmu || cand.nm || sigla).trim(),
          sigla,
          numero: String(cand.n ?? ""),
          sq: String(cand.sqcand ?? ""),
          st: String(cand.st ?? "").trim(),
          votos,
        });
      }
      let votos = proportional ? num(party.tvtn) + num(party.tvtl) : 0;
      if (!proportional || votos === 0) votos = nominal;
      parties.push({
        sigla,
        numero: String(party.n ?? ""),
        nome: String(party.nm || sigla).trim(),
        votos,
      });
    }
  }
  return {
    candidates,
    parties,
    and: andCode(json?.and),
    ts: num(json?.s?.ts),
    done: num(json?.s?.st),
    vv: num(json?.v?.vv),
    vb: num(json?.v?.vb),
    vn: num(json?.v?.tvn),
    g: [json?.dg, json?.hg].filter(Boolean).join(" "),
  };
}

function keyOf(person) {
  return person.sq || `${person.sigla}:${person.numero}`;
}

function catalogFrom(parsed) {
  return {
    c: parsed.candidates.map((item) => [item.nome, item.sigla, item.numero, item.sq, item.st]),
    p: parsed.parties.map((item) => [item.sigla, item.numero, item.nome]),
    candKeys: parsed.candidates.map(keyOf),
    partyKeys: parsed.parties.map((item) => item.sigla),
    g: parsed.g,
  };
}

function absorb(catalog, parsed) {
  const candAt = new Map(catalog.candKeys.map((key, index) => [key, index]));
  const partyAt = new Map(catalog.partyKeys.map((key, index) => [key, index]));
  for (const person of parsed.candidates) {
    const key = keyOf(person);
    let index = candAt.get(key);
    if (index == null) {
      index = catalog.candKeys.length;
      catalog.candKeys.push(key);
      catalog.c.push([person.nome, person.sigla, person.numero, person.sq, person.st]);
      candAt.set(key, index);
    } else if (person.st && !catalog.c[index][4]) catalog.c[index][4] = person.st;
  }
  for (const party of parsed.parties) {
    if (partyAt.has(party.sigla)) continue;
    partyAt.set(party.sigla, catalog.partyKeys.length);
    catalog.partyKeys.push(party.sigla);
    catalog.p.push([party.sigla, party.numero, party.nome]);
  }
}

function rowFrom(parsed, catalog) {
  const candAt = new Map(catalog.candKeys.map((key, index) => [key, index]));
  const partyAt = new Map(catalog.partyKeys.map((key, index) => [key, index]));
  const votes = Array(catalog.candKeys.length + catalog.partyKeys.length).fill(0);
  for (const person of parsed.candidates) {
    const index = candAt.get(keyOf(person));
    if (index != null) votes[index] += person.votos;
  }
  for (const party of parsed.parties) {
    const index = partyAt.get(party.sigla);
    if (index != null) votes[catalog.candKeys.length + index] += party.votos;
  }
  return [parsed.and, parsed.ts, parsed.done, parsed.vv, parsed.vb, parsed.vn, ...votes];
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

async function pool(items, worker) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;
      await worker(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, items.length) }, () => run()));
}

const config = JSON.parse(readFileSync(new URL("../public/mun-config.json", import.meta.url), "utf8"));
const states = config.abr
  .map((state) => ({
    uf: String(state.cd ?? "").toUpperCase(),
    mu: (state.mu ?? [])
      .map((mun) => ({
        cd: String(mun.cd ?? "").replace(/\D/g, "").padStart(5, "0"),
        ibge: String(mun.cdi ?? "").replace(/\D/g, "").padStart(7, "0"),
      }))
      .filter((mun) => mun.cd !== "00000" && mun.ibge !== "0000000"),
  }))
  .filter((state) => state.uf && (!onlyUf || state.uf === onlyUf));

async function loadCities(office, state) {
  const parsed = [];
  let done = 0;
  await pool(state.mu, async (mun) => {
    const json = await pull(fileUrl(office, state.uf, mun.cd));
    done += 1;
    if (done % 200 === 0) console.log(`${office.id} ${state.uf} ${done}/${state.mu.length}`);
    if (!json) return;
    parsed.push([mun.ibge, walk(json, office.proportional)]);
  });
  return parsed;
}

function packCities(catalog, parsedCities) {
  const packed = {};
  for (const [ibge, parsed] of parsedCities) packed[ibge] = rowFrom(parsed, catalog);
  return packed;
}

async function snapshotState(office, state) {
  const target = `${ROOT}/${office.id}/${state.uf}.json`;
  if (existsSync(target)) {
    console.log(`ok ${office.id} ${state.uf}`);
    return;
  }
  const stateJson = await pull(fileUrl(office, state.uf));
  if (!stateJson) {
    console.log(`sem arquivo ${office.id} ${state.uf}`);
    return;
  }
  const parsed = walk(stateJson, office.proportional);
  const catalog = catalogFrom(parsed);
  const cities = await loadCities(office, state);
  for (const [, city] of cities) absorb(catalog, city);
  const body = {
    g: catalog.g,
    c: catalog.c,
    p: catalog.p,
    u: rowFrom(parsed, catalog),
    m: packCities(catalog, cities),
  };
  writeJson(target, body);
  console.log(`${office.id} ${state.uf} ${Object.keys(body.m).length} cidades ${(JSON.stringify(body).length / 1024).toFixed(0)} KB`);
}

async function snapshotPresident() {
  const target = `${ROOT}/presidente.json`;
  if (existsSync(target)) {
    console.log("ok presidente");
    return;
  }
  const office = OFFICES[0];
  const brJson = await pull(fileUrl(office, "br"));
  if (!brJson) throw new Error("sem arquivo nacional de presidente");
  const brParsed = walk(brJson, false);
  const catalog = catalogFrom(brParsed);
  const ufParsed = {};
  const cityParsed = [];
  for (const state of states) {
    const partPath = `${CACHE}/presidente-${state.uf}.json`;
    if (!existsSync(partPath)) {
      const stateJson = await pull(fileUrl(office, state.uf));
      const cities = await loadCities(office, state);
      writeJson(partPath, { u: stateJson ? walk(stateJson, false) : null, m: cities });
      console.log(`presidente ${state.uf} ${cities.length}`);
    }
    const part = JSON.parse(readFileSync(partPath, "utf8"));
    if (part.u) ufParsed[state.uf] = part.u;
    if (Array.isArray(part.m)) cityParsed.push(...part.m);
  }
  for (const parsed of Object.values(ufParsed)) absorb(catalog, parsed);
  for (const [, parsed] of cityParsed) absorb(catalog, parsed);
  const uf = {};
  for (const [code, parsed] of Object.entries(ufParsed)) uf[code] = rowFrom(parsed, catalog);
  writeJson(target, {
    g: catalog.g,
    c: catalog.c,
    p: catalog.p,
    br: rowFrom(brParsed, catalog),
    uf,
    m: packCities(catalog, cityParsed),
  });
  console.log(`presidente ${cityParsed.length} cidades ${(readFileSync(target).length / 1024 / 1024).toFixed(2)} MB`);
}

await snapshotPresident();
for (const office of OFFICES) {
  if (office.national) continue;
  for (const state of states) await snapshotState(office, state);
}
console.log("snapshot pronto");
