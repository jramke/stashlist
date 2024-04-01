import type { Actions, PageServerLoad } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { formSchema, type FormSchema } from './schema';
import { db } from '$lib/server/db';
import { group } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	console.log('parentData', parentData);

	const formSchemaWithDefaults = formSchema.extend({
		title: formSchema.shape.title.default('Test Title')
	})

	return {
		form: await superValidate(formSchemaWithDefaults),
	};
};

export const actions: Actions = {
	default: async (event) => {	
		const form = await superValidate(event, formSchema);

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
		
		try {
			await db.update(group)
				.set({
					title: form.data.title,
				}).where(eq(group.id, form.data.id));

		} catch (error) {
			console.log('Error updating group', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
	}
};
