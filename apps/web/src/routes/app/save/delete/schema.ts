import { z } from 'zod';
export const formSchema = z.object({
	id: z.string()
});
export type FormSchema = typeof formSchema;
