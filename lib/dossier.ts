import { TSE_YEAR, tsePageUrl, type TseIdentity } from "./tse";

export type AssetItem = {
  description: string;
  value: number | null;
};

export type MoneySource = {
  label: string;
  value: number;
};

export type CandidateDossier = {
  officialUrl: string;
  loaded: boolean;
  situation: string | null;
  assetsTotal: number | null;
  assets: AssetItem[];
  raised: number | null;
  spent: number | null;
  spendingLimit: number | null;
  sources: MoneySource[];
  note: string;
};

const cache = new Map<string, { at: number; dossier: CandidateDossier }>();
const OK_TTL = 15 * 60 * 1000;
const MISS_TTL = 2 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = numberFrom(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function pickText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function bagsOf(record: Record<string, unknown>) {
  const nested = ["dadosConsolidados", "consolidado", "prestacaoContas", "contas", "financeiro", "despesas"];
  return [record, ...nested.map((key) => record[key]).filter(isRecord)];
}

function findArray(record: Record<string, unknown>, keys: string[]) {
  for (const bag of bagsOf(record)) {
    for (const key of keys) {
      if (Array.isArray(bag[key])) return bag[key];
    }
  }
  return [];
}

function assetDescription(item: Record<string, unknown>) {
  const parts = [item.descricao, item.descricaoDeTipoDeBem, item.dsTipoBem, item.tipoBem, item.dsBem]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim());
  return [...new Set(parts)].join(" — ") || "Bem declarado";
}

function parseAssets(record: Record<string, unknown>): AssetItem[] {
  if (record.st_DIVULGA_BENS === false) return [];
  return findArray(record, ["bens", "listaBens", "declaracaoBens"])
    .filter(isRecord)
    .map((item) => ({
      description: assetDescription(item),
      value: pickNumber(item, ["valor", "vrBem", "vrBemCandidato", "valorBem"]),
    }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
    .slice(0, 40);
}

function parseSources(record: Record<string, unknown>): MoneySource[] {
  const labels: Array<[string, string[]]> = [
    ["Fundo especial", ["fundoEspecial", "totalRecebidoFEFC", "totalFefc", "vrFundoEspecial"]],
    ["Fundo partidário", ["fundosPartidarios", "fundoPartidario", "totalFundoPartidario", "vrFundoPartidario"]],
    ["Outros recursos", ["outrosRecursos", "totalOutrosRecursos", "vrOutrosRecursos"]],
  ];
  const sources: MoneySource[] = [];
  for (const bag of bagsOf(record)) {
    for (const [label, keys] of labels) {
      if (sources.some((item) => item.label === label)) continue;
      const value = pickNumber(bag, keys);
      if (value) sources.push({ label, value });
    }
  }
  return sources;
}

function absorb(target: CandidateDossier, record: Record<string, unknown>) {
  target.situation ??= pickText(record, ["descricaoSituacao", "descricaoTotalizacao", "situacaoCandidatura"]);
  const assets = parseAssets(record);
  if (assets.length > target.assets.length) target.assets = assets;
  target.assetsTotal ??= pickNumber(record, ["totalDeBens", "vrTotalBens", "valorTotalBens"]);
  for (const bag of bagsOf(record)) {
    target.raised ??= pickNumber(bag, ["totalRecebido", "totalReceitas", "totalFinanceiro"]);
    target.spent ??= pickNumber(bag, ["totalDespesasContratadas", "totalDespesasPagas", "totalDespesas"]);
    target.spendingLimit ??= pickNumber(bag, ["valorLimiteDeGastos", "limiteDeGasto1T", "gastoCampanha1T"]);
  }
  if (target.sources.length === 0) target.sources = parseSources(record);
  if (target.assetsTotal === null && target.assets.some((item) => item.value !== null)) {
    target.assetsTotal = target.assets.reduce((sum, item) => sum + (item.value ?? 0), 0);
  }
}

async function readJson(url: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Referer: "https://divulgacandcontas.tse.jus.br/divulga/",
      "User-Agent": "meuvoto.org",
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  return isRecord(payload) ? payload : null;
}

export async function loadDossier(identity: TseIdentity): Promise<CandidateDossier> {
  const key = `${identity.eleicao}:${identity.uf}:${identity.sq}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < (cached.dossier.loaded ? OK_TTL : MISS_TTL)) {
    return cached.dossier;
  }

  const dossier: CandidateDossier = {
    officialUrl: tsePageUrl(identity),
    loaded: false,
    situation: null,
    assetsTotal: null,
    assets: [],
    raised: null,
    spent: null,
    spendingLimit: null,
    sources: [],
    note: "Não consegui consultar o TSE agora. A ficha oficial continua no DivulgaCandContas.",
  };

  const candidateUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/${TSE_YEAR}/${identity.uf}/${identity.eleicao}/candidato/${identity.sq}`;
  let candidate: Record<string, unknown> | null = null;
  try {
    candidate = await readJson(candidateUrl);
  } catch {
    candidate = null;
  }
  if (candidate) absorb(dossier, candidate);

  const cargo = isRecord(candidate?.cargo) ? numberFrom(candidate.cargo.codigo) : null;
  const party = isRecord(candidate?.partido) ? numberFrom(candidate.partido.numero) : null;
  const ballot = candidate ? numberFrom(candidate.numero) : null;
  if (candidate && cargo !== null && party !== null && ballot !== null) {
    const accountsUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/${identity.eleicao}/${TSE_YEAR}/${identity.uf}/${cargo}/${party}/${ballot}/${identity.sq}`;
    try {
      const accounts = await readJson(accountsUrl);
      if (accounts) absorb(dossier, accounts);
    } catch {
      // A ficha de bens continua válida se a prestação não responder.
    }
  }

  dossier.loaded = Boolean(
    dossier.situation ||
      dossier.assets.length ||
      dossier.assetsTotal !== null ||
      dossier.raised !== null ||
      dossier.spent !== null,
  );
  if (dossier.loaded) {
    dossier.note = "Bens declarados e prestação de contas parcial publicados pelo TSE. A conta final sai depois da eleição.";
  }

  cache.set(key, { at: Date.now(), dossier });
  return dossier;
}
