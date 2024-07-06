import type { RequestHandler } from './$types';

import { error, json, redirect } from '@sveltejs/kit';
import { getSaveWithGroups } from '$lib/server/db/queries';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');

	try {
		const saveId = params.id;
		const saveWithGroups = await getSaveWithGroups(saveId);
		return json(saveWithGroups);
	} catch (err) {
		console.log('error fetch save', err);
		return error(400, {
			message: 'Failed to fetch save'
		});
	}
};
