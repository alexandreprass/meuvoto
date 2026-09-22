import type { Candidate } from "./offices";

export const TSE_YEAR = "2026";
export const TSE_ELECTION = "20322002026";

export type TseIdentity = {
  sq: string;
  uf: string;
  eleicao: string;
};

export function tseIdentity(candidate: Candidate): TseIdentity | null {
  const photo = candidate.photo.match(/\/arquivo\/img\/(\d+)\/(\d+)\/([A-Z]{2})/);
  if (photo) return { eleicao: photo[1], sq: photo[2], uf: photo[3] };

  const sq = candidate.sq ?? candidate.source?.match(/SQ_CANDIDATO\s+(\d+)/)?.[1];
  if (!sq || !/^\d{5,20}$/.test(sq)) return null;
  const uf = candidate.tseUf ?? candidate.state ?? "BR";
  if (!/^[A-Z]{2}$/.test(uf)) return null;
  return { sq, uf, eleicao: TSE_ELECTION };
}

export function tsePageUrl(identity: TseIdentity) {
  return `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${TSE_YEAR}/${identity.eleicao}/${identity.uf}/${identity.sq}`;
}
