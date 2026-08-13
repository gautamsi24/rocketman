import { createHash } from "node:crypto";

/**
 * Normalizes and hashes question/prompt text for dedup -- shared by the
 * check-question (QnA) and FRQ generation paths so "is this the same
 * question, differently phrased-and-cased" is computed identically in both
 * places rather than two independently-maintained copies.
 */
export function questionHash(text: string): string {
  return createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}
