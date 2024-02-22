import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { error, json, redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	try {
		const userId = locals.user.id;
		const savesWithGroups = await db.query.save.findMany({
			where: (save, { eq }) => eq(save.userId, userId),
			with: {
				saveGroups: {
					with: {
						group: true
					}
				}
			}
		});

		savesWithGroups.sort((a, b) => {
			const dateA = new Date(a.createdAt).getTime();
			const dateB = new Date(b.createdAt).getTime();
			return dateB - dateA; // Sorting in descending order
		});

		return json(savesWithGroups);
	} catch (err) {
		console.log('error fetch saves', err);
		return error(400, {
			message: 'Failed to fetch saves'
		});
	}
};
