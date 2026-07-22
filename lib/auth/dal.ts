import "server-only";
import { readSessionLearnerId } from "./session";

export async function getSessionLearnerId(): Promise<string | null> {
  return readSessionLearnerId();
}
