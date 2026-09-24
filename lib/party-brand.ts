const PARTY_COLORS: Record<string, string> = {
  AVANTE: "#098a89",
  CIDADANIA: "#df2638",
  MDB: "#0870b8",
  MISSAO: "#641d87",
  NOVO: "#f37321",
  PCDOB: "#d4222a",
  PDT: "#d72335",
  PL: "#15488f",
  PODE: "#00918b",
  PP: "#16814b",
  PRD: "#38637d",
  PSB: "#f04b55",
  PSD: "#f08a24",
  PSDB: "#168ac0",
  PSOL: "#e7a600",
  PT: "#d51f2a",
  PV: "#168b49",
  REDE: "#168876",
  REPUBLICANOS: "#1694c1",
  SOLIDARIEDADE: "#dca900",
  UNIAO: "#164e7b",
};

const PARTY_MARKS: Record<string, string> = {
  AVANTE: "AVA",
  CIDADANIA: "CID",
  MISSAO: "MIS",
  NOVO: "NOVO",
  PCDOB: "PCdoB",
  REPUBLICANOS: "REP",
  SOLIDARIEDADE: "SD",
  UNIAO: "UNI",
};

export function normalizeParty(party: string) {
  return party.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function getPartyColor(party: string) {
  return PARTY_COLORS[normalizeParty(party)] ?? "#536b60";
}

export function getPartyMark(party: string) {
  const normalized = normalizeParty(party);
  return PARTY_MARKS[normalized] ?? party.trim().slice(0, 4).toLocaleUpperCase("pt-BR");
}

const PARTY_LOGO_ALIASES: Record<string, string> = {
  UNIAO: "uniao",
  UNIAOBRASIL: "uniao",
  PCDOB: "pcdob",
  PRD: "prdt",
  MOBILIZA: "mobiliza",
};

const PARTY_LOGO_EXTENSIONS: Record<string, string> = {
  MISSAO: "png",
  PODE: "png",
  DC: "png",
  PRTB: "png",
  PSTU: "png",
};

export function getPartyLogoPath(party: string) {
  const key = normalizeParty(party);
  const filename = PARTY_LOGO_ALIASES[key] ?? key.toLowerCase();
  const extension = PARTY_LOGO_EXTENSIONS[key] ?? "svg";
  return `/parties/${filename}.${extension}`;
}
