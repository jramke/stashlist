import type { Actions } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { redirect } from '@sveltejs/kit';
import { siteConfig } from '@repo/constants';
import { deleteGroup } from '$lib/server/db/queries';

export const actions: Actions = {
	default: async (event) => {	
		const form = await superValidate(event, zod(formSchema));
		
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}

		try {
			await deleteGroup(form.data.id);
			
		} catch (error) {
			console.log('Error deleting group', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
		
		if (form.data.isOnCurrentSlug) {
			redirect(301, siteConfig.appUrl);
		}
	}
};
