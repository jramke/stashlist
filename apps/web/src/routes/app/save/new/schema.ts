import { z } from 'zod';
export const formSchema = z.object({
	url: z.string().url()
});
export type FormSchema = typeof formSchema;
