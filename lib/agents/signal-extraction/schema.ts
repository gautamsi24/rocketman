import { z } from "zod";

export function buildSignalExtractionSchema(candidateCodes: string[]) {
  return z.object({
    correctness: z.enum(["correct", "incorrect", "not_gradable"]),
    matchedMisconceptionCodes:
      candidateCodes.length > 0
        ? z.array(z.enum(candidateCodes as [string, ...string[]]))
        : z.array(z.string()),
    rationale: z.string(),
  });
}
