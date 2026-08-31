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
  total: number;
  national: CandidateTally[];
  byState: Record<string, StateTally>;
};

export type MyVote = {
  candidateId: string;
  state: string;
  createdAt: string;
};

export type MePayload = {
  loggedIn: boolean;
  twitterId?: string;
  username?: string;
  name?: string;
  image?: string;
  vote: MyVote | null;
};
