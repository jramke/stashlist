import { z } from 'zod';
export const formSchema = z.object({
	input: z.string().min(1),
	groups: z.string().optional()
});
export type FormSchema = typeof formSchema;
