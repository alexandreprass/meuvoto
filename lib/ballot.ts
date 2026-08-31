import { CANDIDATES } from "./candidates";
import type { Candidate, OfficeId } from "./offices";
import { getStateCandidates } from "./state-candidates";

export function getCandidatesForOffice(office: OfficeId, state?: string): Candidate[] {
  if (office === "presidente") return CANDIDATES;
  return state ? getStateCandidates(office, state) : [];
}

export function getCandidateForOffice(office: OfficeId, id: string, state?: string) {
  return getCandidatesForOffice(office, state).find((candidate) => candidate.id === id);
}
