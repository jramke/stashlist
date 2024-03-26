import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { PageLoad } from './$types';

import { redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, parent }) => {
	const data = await parent();
	
	if (!data.user) {
		if (browser) {
			goto('/login');
		} else {
			redirect(302, '/login');
		}
	}

	const saves = (await data.saves)?.items;
	const groups = await data.groups;

	const currentGroupId = params.slug;

	//TODO: types
	const currentGroup = groups.filter((group: { id: string; }) => {
		return group.id === currentGroupId;
	})[0];

	if (!currentGroup) return;

	if (!saves || saves.length === 0) {
		return {
			savesByGroup: null,
			currentGroup: currentGroup
		};
	};
	try {
		//TODO: types
		const savesByGroup = saves.filter((save: { saveGroups: any; }) => {
			const groups = save.saveGroups;
			if (groups.length === 0) return;
			return groups.find((item: { group: { id: string; }; }) => item.group.id === currentGroupId)
		})

		if (savesByGroup.length === 0) {
			return {
				savesByGroup: null,
				currentGroup: currentGroup
			};
			// throw Error('No saves found for this group');
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
