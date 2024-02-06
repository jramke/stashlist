import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { error, json, redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');

	try {
		const saveId = params.id;
		const saveWithGroups = await db.query.save.findFirst({
			where: (save, { eq }) => eq(save.id, saveId),
			with: {
				saveGroups: {
					with: {
						group: true
					}
				}
			}
		});
		return json(saveWithGroups);
	} catch (err) {
		console.log('error fetch save', err);
		return error(400, {
			message: 'Failed to fetch save'
		});
	}
};
