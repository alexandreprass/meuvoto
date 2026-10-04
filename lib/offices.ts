export type OfficeId = "presidente" | "governador" | "senador" | "deputado_federal" | "deputado_estadual";

export type Candidate = {
  id: string;
  name: string;
  fullName: string;
  party: string;
  number: string;
  photo: string;
  fallbackPhoto?: string;
  color: string;
  state?: string;
  source?: string;
  sq?: string;
  tseUf?: string;
};

export const OFFICES: Record<OfficeId, { label: string; plural: string }> = {
  presidente: { label: "Presidente", plural: "Presidentes" },
  governador: { label: "Governador", plural: "Governadores" },
  senador: { label: "Senador", plural: "Senadores" },
  deputado_federal: { label: "Deputado Federal", plural: "Deputados Federais" },
  deputado_estadual: { label: "Deputado Estadual", plural: "Deputados Estaduais" },
};

export const OFFICE_SEATS: Record<OfficeId, number> = {
  presidente: 1,
  governador: 1,
  senador: 2,
  deputado_federal: 1,
  deputado_estadual: 1,
};

export const OFFICES_ORDER: OfficeId[] = ["presidente", "governador", "senador", "deputado_federal", "deputado_estadual"];

export type BallotChoices = Partial<Record<OfficeId, Candidate[]>>;

export function slotLabel(office: OfficeId, index: number) {
  const label = OFFICES[office].label;
  return OFFICE_SEATS[office] > 1 ? `${index + 1}º ${label}` : label;
}

function withoutChoice(choices: BallotChoices, office: OfficeId, index: number): BallotChoices {
  const nextList = (choices[office] ?? []).filter((_, itemIndex) => itemIndex !== index);
  const next = { ...choices };
  if (nextList.length === 0) delete next[office];
  else next[office] = nextList;
  return next;
}

export function chooseCandidate(choices: BallotChoices, office: OfficeId, candidate: Candidate, slotIndex?: number | null): BallotChoices {
  const seats = OFFICE_SEATS[office];
  const list = (choices[office] ?? []).slice(0, seats);
  const existing = list.findIndex((item) => item.id === candidate.id);
  if (existing >= 0) return withoutChoice(choices, office, existing);

  const targeted = slotIndex == null || slotIndex < 0 ? null : Math.min(slotIndex, seats - 1);
  if (targeted == null) {
    if (list.length < seats) return { ...choices, [office]: [...list, candidate] };
    const next = list.slice();
    next[seats - 1] = candidate;
    return { ...choices, [office]: next };
  }

  const next = list.slice();
  if (targeted >= next.length) next.push(candidate);
  else next[targeted] = candidate;
  return { ...choices, [office]: next.slice(0, seats) };
}

export function removeChoice(choices: BallotChoices, office: OfficeId, index: number): BallotChoices {
  return withoutChoice(choices, office, index);
}

export function voteScope(office: OfficeId, state: string) {
  return office === "presidente" ? "BR" : state;
}

export function isStateOffice(office: OfficeId) {
  return office !== "presidente";
}
