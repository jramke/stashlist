import type { RequestHandler } from './$types';

import { error, json, redirect } from '@sveltejs/kit';
import { getSavesWithGroups } from '$lib/server/db/queries';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	try {
		const userId = locals.user.id;
		const savesWithGroups = await getSavesWithGroups(userId);

		if (savesWithGroups.length === 0) {
			return json(savesWithGroups)
		}
		
		const groupCounts: Record<string, number> = {};
		let noGroupCount = 0;

		savesWithGroups.forEach(item => {
			if (item.saveGroups.length === 0) {
				noGroupCount++;
			} else {
				item.saveGroups.forEach(saveGroup => {
					const groupId = saveGroup.groupId;
					// Increment count for saves with groups
					groupCounts[groupId] = (groupCounts[groupId] || 0) + 1;
				});
			}
		});

		return json({
			saves: savesWithGroups,
			groupCounts: groupCounts,
			noGroupCount: noGroupCount
		});

	} catch (err) {
		console.log('error fetch saves', err);
		return error(400, {
			message: 'Failed to fetch saves'
		});
	}
};
