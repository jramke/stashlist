import { z } from 'zod';
export const formSchema = z.object({
	url: z.string().url(),
	groups: z.string().optional()
});
export type FormSchema = typeof formSchema;
