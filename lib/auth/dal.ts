import "server-only";
import { readSession, readSessionLearnerId, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  return readSession();
}

export async function getSessionLearnerId(): Promise<string | null> {
  return readSessionLearnerId();
}
