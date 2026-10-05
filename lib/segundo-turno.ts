export type RunoffCandidate = {
  name: string;
  party: string;
  number: string;
  photo: string;
};

export type RunoffContest = {
  uf: string;
  place: string;
  office: string;
  candidates: RunoffCandidate[];
};

/** First-round finalists. The TSE has not published a second-round result file. */
export const SEGUNDO_TURNO: RunoffContest[] = [
  {
    uf: "BR",
    place: "Brasil",
    office: "Presidente",
    candidates: [
      { name: "Flávio Bolsonaro", party: "PL", number: "22", photo: "/candidates/flavio-bolsonaro.jpg" },
      { name: "Lula", party: "PT", number: "13", photo: "/candidates/lula.jpg" },
    ],
  },
  {
    uf: "AC",
    place: "Acre",
    office: "Governador",
    candidates: [
      { name: "Mailza Assis", party: "PP", number: "11", photo: "/candidate-photos/10002544107.jpg" },
      { name: "Alan Rick", party: "Republicanos", number: "10", photo: "/candidate-photos/10002532492.jpg" },
    ],
  },
  {
    uf: "AM",
    place: "Amazonas",
    office: "Governador",
    candidates: [
      { name: "Omar Aziz", party: "PSD", number: "55", photo: "/candidate-photos/40002532272.png" },
      { name: "Professora Maria do Carmo", party: "PL", number: "22", photo: "/candidate-photos/40002541626.png" },
    ],
  },
  {
    uf: "DF",
    place: "Distrito Federal",
    office: "Governador",
    candidates: [
      { name: "Celina Leão", party: "PP", number: "11", photo: "/candidate-photos/70002553055.png" },
      { name: "Leandro Grass", party: "PT", number: "13", photo: "/candidate-photos/70002552496.jpg" },
    ],
  },
  {
    uf: "ES",
    place: "Espírito Santo",
    office: "Governador",
    candidates: [
      { name: "Lorenzo Pazolini", party: "Republicanos", number: "10", photo: "/candidate-photos/80002552682.jpg" },
      { name: "Ricardo Ferraço", party: "MDB", number: "15", photo: "/candidate-photos/80002552172.jpg" },
    ],
  },
  {
    uf: "RJ",
    place: "Rio de Janeiro",
    office: "Governador",
    candidates: [
      { name: "Douglas Ruas", party: "PL", number: "22", photo: "/candidate-photos/190002542887.jpg" },
      { name: "Eduardo Paes", party: "PSD", number: "55", photo: "/candidate-photos/190002543380.jpg" },
    ],
  },
  {
    uf: "RN",
    place: "Rio Grande do Norte",
    office: "Governador",
    candidates: [
      { name: "Allyson", party: "União", number: "44", photo: "/candidate-photos/200002535255.png" },
      { name: "Cadu de Lula", party: "PT", number: "13", photo: "/candidate-photos/200002534001.png" },
    ],
  },
  {
    uf: "TO",
    place: "Tocantins",
    office: "Governador",
    candidates: [
      { name: "Professora Dorinha", party: "União", number: "44", photo: "/candidate-photos/270002544599.jpg" },
      { name: "Vicentinho Júnior", party: "PSDB", number: "45", photo: "/candidate-photos/270002544544.jpg" },
    ],
  },
];

export const RUNOFF_UFS = new Set(SEGUNDO_TURNO.filter((contest) => contest.uf !== "BR").map((contest) => contest.uf));
