import type { PageLoad } from './$types';

import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';

export const load: PageLoad = async ({ params, fetch, parent }) => {
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
		text: formSchema.shape.text.default(save.text),
		groups: formSchema.shape.groups.default(groupIdsString),
		id: formSchema.shape.id.default(save.id),
	})

	return {
	  form: await superValidate(zod(formSchemaWithDefaults)),
	  save: save,
	  groups: await parentData.groups,
	  isDialog: false,
	};
};