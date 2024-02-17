import { z } from 'zod';
export const formSchema = z.object({
	id: z.string(),
	title: z.string().min(1),
	description: z.string(),
	groups: z.string(),
		// .transform( value => value.split( ',' ).map( String ) )
		// .pipe( z.string().array() ),
	// imageUrl: z.string(),
});
export type FormSchema = typeof formSchema;
