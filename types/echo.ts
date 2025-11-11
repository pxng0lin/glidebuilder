export interface EchoUser {
  id: string;
  name: string;
  email: string;
  isOnboarded: boolean;
}

export interface EchoBalance {
  credits: number;
  currency: string;
  lastUpdatedIso: string;
}

export interface EchoSession {
  user: EchoUser;
  balance?: EchoBalance;
  token?: string;
}
