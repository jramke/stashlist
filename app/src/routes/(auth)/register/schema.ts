import { z } from 'zod';
export const formSchema = z.object({
	name: z.string().min(2),
	email: z.string().email().min(5),
	password: z.string().min(8).max(128)
});
export type FormSchema = typeof formSchema;
