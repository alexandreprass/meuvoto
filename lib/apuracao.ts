import type { OfficeId } from "@/lib/offices";

const TSE_ORIGIN = "https://resultados.tse.jus.br/oficial/ele2026";

const PT_STRONG = "#DC2626";
const PT_WEAK = "#FCA5A5";
const PL_STRONG = "#15803D";
const PL_WEAK = "#86EFAC";

type FileSpec = { ele: string; cargo: string; proportional: boolean };

const FILE_SPEC: Record<OfficeId, FileSpec> = {
  presidente: { ele: "6257", cargo: "0001", proportional: false },
  governador: { ele: "6259", cargo: "0003", proportional: false },
  senador: { ele: "6259", cargo: "0005", proportional: false },
  deputado_federal: { ele: "6259", cargo: "0006", proportional: true },
  deputado_estadual: { ele: "6259", cargo: "0007", proportional: true },
};

export function isProportional(office: OfficeId) {
  return FILE_SPEC[office].proportional;
}

/** Unified result file (EA20). Election code is 6 digits: 6257 → e006257. DF state deputies are cargo 8. */
export function resultUrl(office: OfficeId, uf: string) {
  const spec = FILE_SPEC[office];
  const cargo = office === "deputado_estadual" && uf.toUpperCase() === "DF" ? "0008" : spec.cargo;
  const code = uf.toLowerCase();
  const ele = spec.ele.padStart(6, "0");
  return `${TSE_ORIGIN}/${spec.ele}/dados/${code}/${code}-c${cargo}-e${ele}-u.json`;
}

/** One municipality file. TSE code is 5 digits, prefixed by the UF. */
export function municipalityResultUrl(office: OfficeId, uf: string, codigo: string) {
  const spec = FILE_SPEC[office];
  const cargo = office === "deputado_estadual" && uf.toUpperCase() === "DF" ? "0008" : spec.cargo;
  const code = uf.toLowerCase();
  const ele = spec.ele.padStart(6, "0");
  const cd = codigo.padStart(5, "0");
  return `${TSE_ORIGIN}/${spec.ele}/dados/${code}/${code}${cd}-c${cargo}-e${ele}-u.json`;
}

export const MUN_CONFIG_URL = `${TSE_ORIGIN}/6257/config/mun-e006257-cm.json`;

/**
 * Stop refreshing once the count is finished.
 * Majoritarian races can stay andamento "p" after every ballot box is in.
 * Deputies only receive Eleito and Suplente when the TSE sets andamento to "f".
 */
export function tallyComplete(tally: Pick<Tally, "andamento" | "sectionsPct">, office?: OfficeId) {
  if (tally.andamento === "f") return true;
  if (office && isProportional(office)) return false;
  return tally.sectionsPct >= 99.99;
}

const MAP_INK: [number, number, number] = [28, 27, 24];
const LULA_RGB: [number, number, number] = [238, 45, 53];
const FLAVIO_RGB: [number, number, number] = [21, 128, 61];
const MARGIN_MIX = [0.4, 0.62, 0.82, 1];

function mixRgb(target: [number, number, number], amount: number) {
  const channel = (index: number) => Math.round(MAP_INK[index] + (target[index] - MAP_INK[index]) * amount).toString(16).padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/** Four shades, from a lead under 10 points to a lead of 45 points or more. */
export const LULA_RAMP = MARGIN_MIX.map((amount) => mixRgb(LULA_RGB, amount));
export const FLAVIO_RAMP = MARGIN_MIX.map((amount) => mixRgb(FLAVIO_RGB, amount));
export const MAP_EMPTY = "#211F1C";
export const LULA_SOLID = "#DC2626";
export const FLAVIO_SOLID = "#15803D";

/** Solid red where Lula is ahead, solid green where Flávio is ahead. A tie stays empty. */
export function stateWinnerFill(pt: number, pl: number, valid = pt + pl) {
  if (valid <= 0 || pt === pl) return "";
  return pt > pl ? LULA_SOLID : FLAVIO_SOLID;
}

/** Red when Lula is ahead, green when Flávio is ahead. The shade follows the lead in points. A tie stays dark. */
export function winnerFill(pt: number, pl: number, valid = pt + pl) {
  if (valid <= 0 || pt === pl) return MAP_EMPTY;
  const gap = Math.abs(pt - pl) / valid;
  const step = gap < 0.1 ? 0 : gap < 0.25 ? 1 : gap < 0.45 ? 2 : 3;
  return (pt > pl ? LULA_RAMP : FLAVIO_RAMP)[step];
}

export type PartyTally = {
  sigla: string;
  numero: string;
  nome: string;
  votos: number;
  pct: number;
};

export type CandidateTally = {
  nome: string;
  sigla: string;
  numero: string;
  votos: number;
  pct: number;
  sq: string;
  /** TSE cand.st: Eleito, Eleito por QP, Eleito por média, Não eleito, Suplente, 2º turno, or blank. */
  situacao: string;
};

export type Tally = {
  uf: string;
  generated: string;
  andamento: string;
  sectionsTotal: number;
  sectionsDone: number;
  sectionsPct: number;
  valid: number;
  blank: number;
  nulls: number;
  pt: number;
  pl: number;
  parties: PartyTally[];
  candidates: CandidateTally[];
};

type RawCand = { n?: string; nm?: string; nmu?: string; vap?: string; sqcand?: string; st?: string };
type RawParty = { n?: string; sg?: string; nm?: string; tvtn?: string; tvtl?: string; cand?: RawCand[] };
type RawFile = {
  dg?: string;
  hg?: string;
  and?: string;
  carg?: Array<{ agr?: Array<{ par?: RawParty[] }> }>;
  s?: { ts?: string; st?: string; pstn?: string };
  v?: { vv?: string; vb?: string; tvn?: string };
};

function num(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return 0;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function siglaOf(value: string | undefined) {
  return (value ?? "").replace(/\*/g, "").trim();
}

export function parseResult(json: RawFile, uf: string, proportional: boolean): Tally {
  const parties = new Map<string, Omit<PartyTally, "pct">>();
  const candidates: Omit<CandidateTally, "pct">[] = [];

  for (const group of json.carg?.[0]?.agr ?? []) {
    for (const party of group.par ?? []) {
      const sigla = siglaOf(party.sg) || party.n || "?";
      let votos = proportional ? num(party.tvtn) + num(party.tvtl) : 0;
      let nominal = 0;
      for (const cand of party.cand ?? []) {
        const vap = num(cand.vap);
        nominal += vap;
        candidates.push({
          nome: (cand.nmu || cand.nm || sigla).trim(),
          sigla,
          numero: String(cand.n ?? ""),
          votos: vap,
          sq: String(cand.sqcand ?? ""),
          situacao: (cand.st ?? "").trim(),
        });
      }
      if (!proportional || votos === 0) votos = nominal;
      const current = parties.get(sigla);
      if (current) current.votos += votos;
      else parties.set(sigla, { sigla, numero: String(party.n ?? ""), nome: (party.nm || sigla).trim(), votos });
    }
  }

  const valid = num(json.v?.vv);
  const withPct = <T extends { votos: number }>(row: T) => ({
    ...row,
    pct: valid > 0 ? (row.votos / valid) * 100 : 0,
  });
  const partyRows = [...parties.values()].map(withPct).sort((a, b) => b.votos - a.votos || a.sigla.localeCompare(b.sigla, "pt-BR"));
  const candidateRows = candidates.map(withPct).sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));
  const pt = partyRows.find((party) => party.sigla === "PT" || party.numero === "13")?.votos ?? 0;
  const pl = partyRows.find((party) => party.sigla === "PL" || party.numero === "22")?.votos ?? 0;
  const sectionsTotal = num(json.s?.ts);
  const sectionsDone = num(json.s?.st);

  return {
    uf: uf.toUpperCase(),
    generated: [json.dg, json.hg].filter(Boolean).join(" "),
    andamento: json.and ?? "",
    sectionsTotal,
    sectionsDone,
    sectionsPct: sectionsTotal > 0 ? (sectionsDone / sectionsTotal) * 100 : num(json.s?.pstn),
    valid,
    blank: num(json.v?.vb),
    nulls: num(json.v?.tvn),
    pt,
    pl,
    parties: partyRows,
    candidates: candidateRows,
  };
}

export function combineTallies(rows: Tally[], uf: string): Tally {
  const parties = new Map<string, Omit<PartyTally, "pct">>();
  let valid = 0;
  let blank = 0;
  let nulls = 0;
  let sectionsTotal = 0;
  let sectionsDone = 0;
  let started = false;
  let finished = rows.length > 0;

  for (const row of rows) {
    valid += row.valid;
    blank += row.blank;
    nulls += row.nulls;
    sectionsTotal += row.sectionsTotal;
    sectionsDone += row.sectionsDone;
    if (row.andamento === "p" || row.valid > 0) started = true;
    if (row.andamento !== "f") finished = false;
    for (const party of row.parties) {
      const current = parties.get(party.sigla);
      if (current) current.votos += party.votos;
      else parties.set(party.sigla, { sigla: party.sigla, numero: party.numero, nome: party.nome, votos: party.votos });
    }
  }

  const partyRows = [...parties.values()]
    .map((party) => ({ ...party, pct: valid > 0 ? (party.votos / valid) * 100 : 0 }))
    .sort((a, b) => b.votos - a.votos || a.sigla.localeCompare(b.sigla, "pt-BR"));

  return {
    uf,
    generated: "",
    andamento: finished ? "f" : started ? "p" : "n",
    sectionsTotal,
    sectionsDone,
    sectionsPct: sectionsTotal > 0 ? (sectionsDone / sectionsTotal) * 100 : 0,
    valid,
    blank,
    nulls,
    pt: partyRows.find((party) => party.sigla === "PT" || party.numero === "13")?.votos ?? 0,
    pl: partyRows.find((party) => party.sigla === "PL" || party.numero === "22")?.votos ?? 0,
    parties: partyRows,
    candidates: [],
  };
}

/** White on a tie or with no votes. Strong red or green above a 10-point lead; pale red or green up to 10 points. */
export function leadVisual(pt: number, pl: number, valid = pt + pl) {
  if (valid <= 0 || pt === pl) return { fill: "#ffffff", ink: "#171717" };
  const gap = (Math.abs(pt - pl) / valid) * 100;
  const strong = gap > 10;
  const lula = pt > pl;
  return {
    fill: lula ? (strong ? PT_STRONG : PT_WEAK) : (strong ? PL_STRONG : PL_WEAK),
    ink: strong ? "#ffffff" : "#171717",
  };
}

export function andamentoLabel(code: string) {
  if (code === "f") return "Apuração encerrada";
  if (code === "p") return "Apuração parcial";
  if (code === "n") return "Apuração ainda não iniciada";
  return "Apuração";
}
