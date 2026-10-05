import type { Candidate, OfficeId } from "./offices";

export const RUNOFF_OFFICES: OfficeId[] = ["presidente", "governador"];

export const RUNOFF_STATES = ["AC", "AM", "DF", "ES", "RJ", "RN", "TO"] as const;

const president: Candidate[] = [
  { id: "lula", name: "Lula", fullName: "Luiz Inácio Lula da Silva", party: "PT", number: "13", photo: "/candidates/lula.jpg", color: "#DC2626", sq: "280002542548", tseUf: "BR" },
  { id: "flavio-bolsonaro", name: "Flávio Bolsonaro", fullName: "Flávio Bolsonaro", party: "PL", number: "22", photo: "/candidates/flavio-bolsonaro.jpg", color: "#1D4ED8", sq: "280002551544", tseUf: "BR" },
];

const governors: Record<string, Candidate[]> = {
  AC: [
    { id: "governador-ac-alan-rick-10", name: "ALAN RICK", fullName: "ALAN RICK MIRANDA", party: "REPUBLICANOS", number: "10", photo: "/candidate-photos/10002532492.jpg", color: "#0891B2", state: "AC", sq: "10002532492", tseUf: "AC" },
    { id: "governador-ac-mailza-assis-11", name: "MAILZA ASSIS", fullName: "MAILZA ASSIS CAMELI", party: "PP", number: "11", photo: "/candidate-photos/10002544107.jpg", color: "#7C3AED", state: "AC", sq: "10002544107", tseUf: "AC" },
  ],
  AM: [
    { id: "governador-am-professora-maria-do-carmo-22", name: "PROFESSORA MARIA DO CARMO", fullName: "MARIA DO CARMO SEFFAIR LINS DE ALBUQUERQUE", party: "PL", number: "22", photo: "/candidate-photos/40002541626.png", color: "#2563EB", state: "AM", sq: "40002541626", tseUf: "AM" },
    { id: "governador-am-omar-aziz-55", name: "OMAR AZIZ", fullName: "OMAR JOSE ABDELAZIZ", party: "PSD", number: "55", photo: "/candidate-photos/40002532272.png", color: "#BE123C", state: "AM", sq: "40002532272", tseUf: "AM" },
  ],
  DF: [
    { id: "governador-df-celina-leao-11", name: "CELINA LEÃO", fullName: "CELINA LEAO HIZIM FERREIRA", party: "PP", number: "11", photo: "/candidate-photos/70002553055.png", color: "#0F766E", state: "DF", sq: "70002553055", tseUf: "DF" },
    { id: "governador-df-leandro-grass-13", name: "LEANDRO GRASS", fullName: "LEANDRO ANTÔNIO GRASS PEIXOTO", party: "PT", number: "13", photo: "/candidate-photos/70002552496.jpg", color: "#BE123C", state: "DF", sq: "70002552496", tseUf: "DF" },
  ],
  ES: [
    { id: "governador-es-lorenzo-pazolini-10", name: "LORENZO PAZOLINI", fullName: "LORENZO SILVA DE PAZOLINI", party: "REPUBLICANOS", number: "10", photo: "/candidate-photos/80002552682.jpg", color: "#D97706", state: "ES", sq: "80002552682", tseUf: "ES" },
    { id: "governador-es-ricardo-ferraco-15", name: "RICARDO FERRAÇO", fullName: "RICARDO DE REZENDE FERRAÇO", party: "MDB", number: "15", photo: "/candidate-photos/80002552172.jpg", color: "#7C3AED", state: "ES", sq: "80002552172", tseUf: "ES" },
  ],
  RJ: [
    { id: "governador-rj-douglas-ruas-22", name: "DOUGLAS RUAS", fullName: "DOUGLAS RUAS DOS SANTOS", party: "PL", number: "22", photo: "/candidate-photos/190002542887.jpg", color: "#D97706", state: "RJ", sq: "190002542887", tseUf: "RJ" },
    { id: "governador-rj-eduardo-paes-55", name: "EDUARDO PAES", fullName: "EDUARDO DA COSTA PAES", party: "PSD", number: "55", photo: "/candidate-photos/190002543380.jpg", color: "#DC2626", state: "RJ", sq: "190002543380", tseUf: "RJ" },
  ],
  RN: [
    { id: "governador-rn-cadu-de-lula-13", name: "CADU DE LULA", fullName: "CARLOS EDUARDO XAVIER", party: "PT", number: "13", photo: "/candidate-photos/200002534001.png", color: "#DC2626", state: "RN", sq: "200002534001", tseUf: "RN" },
    { id: "governador-rn-allyson-44", name: "ALLYSON", fullName: "ALLYSON LEANDRO BEZERRA SILVA", party: "UNIÃO", number: "44", photo: "/candidate-photos/200002535255.png", color: "#7C3AED", state: "RN", sq: "200002535255", tseUf: "RN" },
  ],
  TO: [
    { id: "governador-to-professora-dorinha-44", name: "PROFESSORA DORINHA", fullName: "MARIA AUXILIADORA SEABRA REZENDE", party: "UNIÃO", number: "44", photo: "/candidate-photos/270002544599.jpg", color: "#4D7C0F", state: "TO", sq: "270002544599", tseUf: "TO" },
    { id: "governador-to-vicentinho-junior-45", name: "VICENTINHO JÚNIOR", fullName: "VICENTE ALVES DE OLIVEIRA JÚNIOR", party: "PSDB", number: "45", photo: "/candidate-photos/270002544544.jpg", color: "#059669", state: "TO", sq: "270002544544", tseUf: "TO" },
  ],
};

export function runoffCandidates(office: OfficeId, uf: string): Candidate[] {
  if (office === "presidente") return president;
  if (office === "governador") return governors[uf] ?? [];
  return [];
}

export function hasGovernorRunoff(uf: string) {
  return Boolean(governors[uf]);
}
