import { z } from 'zod';
export const formSchema = z.object({
	id: z.string(),
	isOnCurrentSlug: z.boolean()
});
export type FormSchema = typeof formSchema;
