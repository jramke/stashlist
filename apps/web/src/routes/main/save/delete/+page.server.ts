import type { Actions } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { deleteSave } from '$lib/server/db/queries';

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(formSchema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}

		try {
			await deleteSave(form.data.id);

		} catch (error) {
			console.log('Error deleting save', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
	}
};
