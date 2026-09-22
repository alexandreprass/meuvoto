export type OfficeId = "presidente" | "senador" | "deputado_federal" | "deputado_estadual";

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
  senador: { label: "Senador", plural: "Senadores" },
  deputado_federal: { label: "Deputado Federal", plural: "Deputados Federais" },
  deputado_estadual: { label: "Deputado Estadual", plural: "Deputados Estaduais" },
};

export function voteScope(office: OfficeId, state: string) {
  return office === "presidente" ? "BR" : state;
}

export function isStateOffice(office: OfficeId) {
  return office !== "presidente";
}
