import type { SessionResponse, UserSessionData } from "../models";

export interface IAuthSessionService {
  buildSession(user: UserSessionData, familyExpiresAt?: Date): Promise<SessionResponse>;
 
}