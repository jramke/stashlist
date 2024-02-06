import { z } from 'zod';
export const formSchema = z.object({
	id: z.string(),
	title: z.string().min(1),
	description: z.string(),
	// faviconUrl: z.string(),
	imageUrl: z.string(),
});
export type FormSchema = typeof formSchema;
