import { tallyComplete, type Tally } from "@/lib/apuracao";

export type Municipio = {
  uf: string;
  cd: string;
  ibge: string;
  nome: string;
};

export type MunCandidate = {
  nome: string;
  sigla: string;
  numero: string;
  pct: number;
  sq: string;
};

export type MunBrief = {
  pt: number;
  pl: number;
  valid: number;
  sectionsPct: number;
  andamento: string;
  top: MunCandidate[];
};

type RawConfig = {
  abr?: Array<{
    cd?: string;
    mu?: Array<{ cd?: string; cdi?: string; nm?: string }>;
  }>;
};

export function parseMunConfig(json: RawConfig): Municipio[] {
  const list: Municipio[] = [];
  for (const state of json.abr ?? []) {
    const uf = (state.cd ?? "").toUpperCase();
    for (const mun of state.mu ?? []) {
      const ibge = String(mun.cdi ?? "").replace(/\D/g, "").padStart(7, "0");
      const cd = String(mun.cd ?? "").replace(/\D/g, "").padStart(5, "0");
      if (!uf || ibge === "0000000" || cd === "00000") continue;
      list.push({ uf, cd, ibge, nome: (mun.nm ?? ibge).trim() });
    }
  }
  return list;
}

export function briefFromTally(tally: Tally): MunBrief {
  return {
    pt: tally.pt,
    pl: tally.pl,
    valid: tally.valid,
    sectionsPct: tally.sectionsPct,
    andamento: tally.andamento,
    top: tally.candidates.slice(0, 5).map((candidate) => ({
      nome: candidate.nome,
      sigla: candidate.sigla,
      numero: candidate.numero,
      pct: candidate.pct,
      sq: candidate.sq,
    })),
  };
}

export function briefComplete(brief: MunBrief) {
  return tallyComplete(brief);
}

/** A missing file should not keep the loader polling forever. */
export const MISSING_BRIEF: MunBrief = {
  pt: 0,
  pl: 0,
  valid: 0,
  sectionsPct: 100,
  andamento: "f",
  top: [],
};
