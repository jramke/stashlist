import { z } from 'zod';
export const formSchema = z.object({
	id: z.string().min(1),
	isOnCurrentSlug: z.boolean()
});
export type FormSchema = typeof formSchema;
