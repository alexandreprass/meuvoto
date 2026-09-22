import type { OfficeId } from "./offices";

export type MyChoice = {
  office: OfficeId;
  candidateId: string;
  state: string;
  stateKey: string;
  createdAt: string;
  updatedAt: string;
};

export type MePayload = {
  loggedIn: boolean;
  twitterId?: string;
  username?: string;
  name?: string;
  image?: string;
  state?: string | null;
  choices: MyChoice[];
};