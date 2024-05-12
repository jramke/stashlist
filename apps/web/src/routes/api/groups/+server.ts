import { getAllGroups } from '$lib/server/db/queries';
import type { RequestHandler } from './$types';
import { error, json, redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	try {
		const groups = await getAllGroups(locals.user.id);
		return json(groups);
	} catch (err) {
		console.log('error fetch groups', err);
		return error(400, {
			message: 'Failed to fetch groups'
		});
	}
};
