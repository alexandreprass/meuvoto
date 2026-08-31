import type { OfficeId } from "./offices";

export type CandidateTally = {
  id: string;
  votes: number;
  percent: number;
};

export type StateTally = {
  total: number;
  candidates: CandidateTally[];
};

export type ResultsPayload = {
  office: OfficeId;
  total: number;
  national: CandidateTally[];
  byState: Record<string, StateTally>;
};

export type MyVote = {
  office: OfficeId;
  candidateId: string;
  state: string;
  stateKey: string;
  createdAt: string;
};

export type MePayload = {
  loggedIn: boolean;
  twitterId?: string;
  username?: string;
  name?: string;
  image?: string;
  state?: string | null;
  canDeleteVotes?: boolean;
  vote: MyVote | null;
  votes: MyVote[];
};