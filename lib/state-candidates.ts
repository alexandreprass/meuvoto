import senators from "@/data/senators.json";
import federalDeputies from "@/data/federal-deputies.json";
import stateDeputies from "@/data/state-deputies.json";
import type { Candidate, OfficeId } from "./offices";

type CandidateFile = { states: Record<string, Candidate[]> };

const files: Record<Exclude<OfficeId, "presidente">, CandidateFile> = {
  senador: senators as CandidateFile,
  deputado_federal: federalDeputies as CandidateFile,
  deputado_estadual: stateDeputies as CandidateFile,
};

export function getStateCandidates(office: Exclude<OfficeId, "presidente">, uf: string) {
  return files[office].states[uf] ?? [];
}
