import type { Actions } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { db } from '$lib/server/db';
import { save, save_group_mm } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(formSchema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}

		try {
			await db.delete(save_group_mm).where(eq(save_group_mm.saveId, form.data.id));
			await db.delete(save).where(eq(save.id, form.data.id));

		} catch (error) {
			console.log('Error deleting save', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
	}
};
