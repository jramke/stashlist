import type { Actions } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { group } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		
		// Define the initial accumulator object with an index signature
		const formSchema: Record<string, z.ZodString> = {};

		// Generate a dynamic Zod schema based on the form data array
		const dynamicFormSchema = z.object(
			Array.from(formData).reduce((acc: Record<string, z.ZodString>, [name, _]) => {
				acc[name] = z.string().min(2);
				return acc;
			}, formSchema)
		);

		const form = await superValidate(formData, dynamicFormSchema);

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
		
		try {
			for (const [key, value] of Object.entries(form.data)) {
				await db.update(group).set({
					title: value,
				}).where(eq(group.id, key));
			}
			
		} catch (error) {
			console.log('Error editing groups', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
	}
};