import type { Actions } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { formSchema } from './schema';

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, formSchema);

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}

		try {
			const response = await event.fetch('/api/groups/new', {
				method: 'POST',
				body: JSON.stringify(form.data)
			});
		} catch (error) {
			console.log('Error creating new group', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
	}
};
