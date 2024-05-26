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
			// const currentGroupIds = (await db.select().from(save_group_mm).where(eq(save_group_mm.saveId, form.data.id)).all()).map(group => group.groupId);
			const newGroups = form.data.groups.split(',');

			await db.update(save)
				.set({
					title: form.data.title,
					description: form.data.description,
				}).where(eq(save.id, form.data.id));

			await db.delete(save_group_mm).where(eq(save_group_mm.saveId, form.data.id));

			for (const groupId of newGroups) {
				if (groupId.length === 0) continue;
				await db.insert(save_group_mm).values({
					userId: event.locals.user?.id as string,
					saveId: form.data.id,
					groupId: groupId
				})
			}

		} catch (error) {
			console.log('Error updating save', error);
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
	}
};
