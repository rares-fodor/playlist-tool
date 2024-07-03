import { z } from "zod";

export const formSchema = z.object({
  ids: z.array(z.string()),
})

export type FormSchema = typeof formSchema;