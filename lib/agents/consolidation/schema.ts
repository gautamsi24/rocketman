import { z } from "zod";

export const consolidationSchema = z.object({
  insights: z.array(z.string()).max(3),
});
