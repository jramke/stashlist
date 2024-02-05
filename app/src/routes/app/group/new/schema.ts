import { z } from 'zod';
export const formSchema = z.object({
	title: z.string().min(2)
});
export type FormSchema = typeof formSchema;
