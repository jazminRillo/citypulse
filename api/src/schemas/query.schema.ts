import z from "zod";

export const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type QueryOutput = z.output<typeof querySchema>;