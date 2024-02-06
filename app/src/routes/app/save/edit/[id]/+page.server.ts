import type { Actions, PageServerLoad } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { formSchema } from './schema';
import { db } from '$lib/server/db';
import { save, save_group_mm, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, fetch }) => {
	
	async function getSaveById(id: string) {
		try {
			const response = await fetch('/api/saves/' + id);
			if (!response.ok) {
				throw new Error(`Error getting save. Status: ${response.status}`);
			}
			const save = await response.json();
			return save;
		} catch (error) {
			console.log('Error getting save', error);
			return null;
		}
	}

	return {
	  form: await superValidate(formSchema),
	  save: await getSaveById(params.id)
	};
};

export const actions: Actions = {
	default: async (event) => {	
		const form = await superValidate(event, formSchema);
		
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
		
		try {
			await db.update(save)
				.set({
					title: form.data.title,
					description: form.data.description,
					// faviconUrl: form.data.faviconUrl,
					imageUrl: form.data.imageUrl
				}).where(eq(save.id, form.data.id));
			// await db.delete(save_group_mm).where(eq(save_group_mm.saveId, form.data.id));

		} catch (error) {
			console.log('Error deleting save', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
	}
};
