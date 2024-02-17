import type { PageServerLoad } from './$types';

import { db } from '$lib/server/db';
import { save_group_mm, user, save, group } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { eq, getTableColumns } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	if (!locals.user) redirect(302, '/login');

	const data = await parent();
	const saves = await data.saves;
	const groups = await data.groups;

	const currentGroupId = params.slug;

	//TODO: types
	const currentGroup = groups.filter((group: { id: string; }) => {
		return group.id === currentGroupId;
	})[0];

	try {
		if (saves.length === 0) {
			throw Error('No saves found');
		}

		//TODO: types
		const savesByGroup = saves.filter((save: { saveGroups: any; }) => {
			const groups = save.saveGroups;
			if (groups.length === 0) return;
			return groups.find((item: { group: { id: string; }; }) => item.group.id === currentGroupId)
		})

		if (savesByGroup.length === 0) {
			throw Error('No saves found for this group');
		}

		return {
			savesByGroup: savesByGroup,
			currentGroup: currentGroup
		}

		
	} catch (err) {
		console.error('Error fetching saves by group', err);
		return {
			savesByGroup: null,
			currentGroup: currentGroup
		};
	}
};
