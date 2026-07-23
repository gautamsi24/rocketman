import { z } from "zod";

export const consolidationSchema = z.object({
  insights: z.array(z.string().min(1).max(200)).max(3),
});
