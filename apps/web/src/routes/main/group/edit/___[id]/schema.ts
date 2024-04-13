import { z } from 'zod';

export const formSchema = z.object({
	id: z.string(),
	title: z.string().min(2),
});
export type FormSchema = typeof formSchema;
