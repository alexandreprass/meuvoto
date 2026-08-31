import { STATES } from "./states";
import type { ResultsPayload } from "./types";
import type { OfficeId } from "./offices";

export function emptyResults(office: OfficeId = "presidente"): ResultsPayload {
  return {
    office,
    total: 0,
    national: [],
    byState: Object.fromEntries(
      STATES.map((s) => [
        s.uf,
        { total: 0, candidates: [] },
      ]),
    ),
  };
}