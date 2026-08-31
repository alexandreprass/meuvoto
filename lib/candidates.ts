import type { Candidate } from "./offices";

export type { Candidate };

export const CANDIDATES: Candidate[] = [
  {
    id: "flavio-bolsonaro",
    name: "Flávio Bolsonaro",
    fullName: "Flávio Bolsonaro",
    party: "PL",
    number: "22",
    photo: "/candidates/flavio-bolsonaro.jpg",
    color: "#1D4ED8",
  },
  {
    id: "lula",
    name: "Lula",
    fullName: "Luiz Inácio Lula da Silva",
    party: "PT",
    number: "13",
    photo: "/candidates/lula.jpg",
    color: "#DC2626",
  },
  {
    id: "renan-santos",
    name: "Renan Santos",
    fullName: "Renan Santos",
    party: "Missão",
    number: "14",
    photo: "/candidates/renan-santos.jpg",
    color: "#CA8A04",
  },
  {
    id: "augusto-cury",
    name: "Augusto Cury",
    fullName: "Augusto Cury",
    party: "Avante",
    number: "70",
    photo: "/candidates/augusto-cury.jpg",
    color: "#7C3AED",
  },
  {
    id: "ronaldo-caiado",
    name: "Ronaldo Caiado",
    fullName: "Ronaldo Caiado",
    party: "PSD",
    number: "55",
    photo: "/candidates/ronaldo-caiado.jpg",
    color: "#0891B2",
  },
  {
    id: "zema",
    name: "Zema",
    fullName: "Romeu Zema",
    party: "Novo",
    number: "30",
    photo: "/candidates/zema.jpg",
    color: "#EA580C",
  },
];

export function getCandidate(id: string) {
  return CANDIDATES.find((c) => c.id === id);
}