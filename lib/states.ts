export type Region = "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";

export type BrazilState = {
  uf: string;
  name: string;
  ibge: string;
  region: Region;
  color: string;
};

export const STATES: BrazilState[] = [
  { uf: "AC", name: "Acre", ibge: "12", region: "Norte", color: "#F4A261" },
  { uf: "AL", name: "Alagoas", ibge: "27", region: "Nordeste", color: "#9B5DE5" },
  { uf: "AP", name: "Amapá", ibge: "16", region: "Norte", color: "#00F5D4" },
  { uf: "AM", name: "Amazonas", ibge: "13", region: "Norte", color: "#2A9D8F" },
  { uf: "BA", name: "Bahia", ibge: "29", region: "Nordeste", color: "#E9C46A" },
  { uf: "CE", name: "Ceará", ibge: "23", region: "Nordeste", color: "#00BBF9" },
  { uf: "DF", name: "Distrito Federal", ibge: "53", region: "Centro-Oeste", color: "#F15BB5" },
  { uf: "ES", name: "Espírito Santo", ibge: "32", region: "Sudeste", color: "#80B918" },
  { uf: "GO", name: "Goiás", ibge: "52", region: "Centro-Oeste", color: "#E76F51" },
  { uf: "MA", name: "Maranhão", ibge: "21", region: "Nordeste", color: "#F77F00" },
  { uf: "MT", name: "Mato Grosso", ibge: "51", region: "Centro-Oeste", color: "#43AA8B" },
  { uf: "MS", name: "Mato Grosso do Sul", ibge: "50", region: "Centro-Oeste", color: "#4CC9F0" },
  { uf: "MG", name: "Minas Gerais", ibge: "31", region: "Sudeste", color: "#E63946" },
  { uf: "PA", name: "Pará", ibge: "15", region: "Norte", color: "#FEE440" },
  { uf: "PB", name: "Paraíba", ibge: "25", region: "Nordeste", color: "#B5179E" },
  { uf: "PR", name: "Paraná", ibge: "41", region: "Sul", color: "#118AB2" },
  { uf: "PE", name: "Pernambuco", ibge: "26", region: "Nordeste", color: "#EF476F" },
  { uf: "PI", name: "Piauí", ibge: "22", region: "Nordeste", color: "#06D6A0" },
  { uf: "RJ", name: "Rio de Janeiro", ibge: "33", region: "Sudeste", color: "#5B8DEF" },
  { uf: "RN", name: "Rio Grande do Norte", ibge: "24", region: "Nordeste", color: "#FF6B6B" },
  { uf: "RS", name: "Rio Grande do Sul", ibge: "43", region: "Sul", color: "#7B2CBF" },
  { uf: "RO", name: "Rondônia", ibge: "11", region: "Norte", color: "#FB8500" },
  { uf: "RR", name: "Roraima", ibge: "14", region: "Norte", color: "#8AC926" },
  { uf: "SC", name: "Santa Catarina", ibge: "42", region: "Sul", color: "#4895EF" },
  { uf: "SP", name: "São Paulo", ibge: "35", region: "Sudeste", color: "#FFD166" },
  { uf: "SE", name: "Sergipe", ibge: "28", region: "Nordeste", color: "#F72585" },
  { uf: "TO", name: "Tocantins", ibge: "17", region: "Norte", color: "#457B9D" },
];

export const IBGE_TO_UF: Record<string, string> = Object.fromEntries(
  STATES.map((s) => [s.ibge, s.uf]),
);

export const UF_MAP: Record<string, BrazilState> = Object.fromEntries(
  STATES.map((s) => [s.uf, s]),
);

export const REGIONS: Region[] = [
  "Norte",
  "Nordeste",
  "Centro-Oeste",
  "Sudeste",
  "Sul",
];

export function formatVotes(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function formatPercent(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);
}
