import type { Actions } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { db } from '$lib/server/db';
import { group, save_group_mm } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { siteConfig } from '$lib/config/site';

export const actions: Actions = {
	default: async (event) => {	
		const form = await superValidate(event, zod(formSchema));
		
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}

		try {
			await db.delete(save_group_mm).where(eq(save_group_mm.groupId, form.data.id));
			await db.delete(group).where(eq(group.id, form.data.id));
			
		} catch (error) {
			console.log('Error deleting group', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
		
		if (form.data.isOnCurrentSlug) {
			redirect(301, siteConfig.appUrl);
		}
	}
};
