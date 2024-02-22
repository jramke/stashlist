import type { Actions, PageServerLoad } from './$types';

import { superValidate, message } from 'sveltekit-superforms/server';
import { formSchema, type FormSchema } from './schema';
import { db } from '$lib/server/db';
import { save, save_group_mm, user } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, fetch, parent }) => {
	const parentData = await parent();

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

	const save = await getSaveById(params.id);
	const groupIdsString = save.saveGroups.map((group: { groupId: string; }) => group.groupId).join(',');

	const formSchemaWithDefaults = formSchema.extend({
		title: formSchema.shape.title.default(save.title),
		description: formSchema.shape.description.default(save.description),
		groups: formSchema.shape.groups.default(groupIdsString),
		// imageUrl: formSchema.shape.imageUrl.default(save.imageUrl),
	})

	return {
	  form: await superValidate(formSchemaWithDefaults),
	  save: save,
	  groups: await parentData.groups
	};
};

export const actions: Actions = {
	default: async (event) => {	
		const form = await superValidate(event, formSchema);

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Something went wrong. Please try again.' });
		}
		
		try {
			// const currentGroupIds = (await db.select().from(save_group_mm).where(eq(save_group_mm.saveId, form.data.id)).all()).map(group => group.groupId);
			const newGroups = form.data.groups.split(',');
			console.log(newGroups);

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
