import type { Actions } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(formSchema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}

		try {
			const response = await event.fetch('/api/saves/new', {
				method: 'POST',
				body: JSON.stringify(form.data)
			});

			if (!response.ok) {
				throw new Error(`Error creating save. Status: ${response.status}`);
			}

		} catch (error) {
			console.log('Error creating new save', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
	}
};
