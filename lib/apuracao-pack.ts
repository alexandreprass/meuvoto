import type { Tally } from "@/lib/apuracao";

export type Pack = {
  g?: string;
  c: [string, string, string, string, string][];
  p: [string, string, string][];
  u?: number[];
  br?: number[];
  uf?: Record<string, number[]>;
  m?: Record<string, number[]>;
};

const AND = ["n", "p", "f"];

export function unpack(row: number[] | undefined, pack: Pack, uf: string): Tally | null {
  if (!row) return null;
  const valid = row[3] ?? 0;
  const candidates = pack.c
    .map((item, index) => {
      const votos = row[6 + index] ?? 0;
      return {
        nome: item[0],
        sigla: item[1],
        numero: item[2],
        votos,
        sq: item[3],
        situacao: item[4] ?? "",
        pct: valid > 0 ? (votos / valid) * 100 : 0,
      };
    })
    .sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, "pt-BR"));
  const partyAt = 6 + pack.c.length;
  const parties = pack.p
    .map((item, index) => {
      const votos = row[partyAt + index] ?? 0;
      return {
        sigla: item[0],
        numero: item[1],
        nome: item[2],
        votos,
        pct: valid > 0 ? (votos / valid) * 100 : 0,
      };
    })
    .sort((a, b) => b.votos - a.votos || a.sigla.localeCompare(b.sigla, "pt-BR"));
  const sectionsTotal = row[1] ?? 0;
  const sectionsDone = row[2] ?? 0;
  return {
    uf,
    generated: pack.g ?? "",
    andamento: AND[row[0] ?? 0] ?? "n",
    sectionsTotal,
    sectionsDone,
    sectionsPct: sectionsTotal > 0 ? (sectionsDone / sectionsTotal) * 100 : 0,
    valid,
    blank: row[4] ?? 0,
    nulls: row[5] ?? 0,
    pt: parties.find((party) => party.sigla === "PT" || party.numero === "13")?.votos ?? 0,
    pl: parties.find((party) => party.sigla === "PL" || party.numero === "22")?.votos ?? 0,
    parties,
    candidates,
  };
}
