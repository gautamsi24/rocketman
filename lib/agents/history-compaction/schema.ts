import { z } from "zod";

export const historyCompactionSchema = z.object({
  summary: z.string().min(1).max(400),
});
