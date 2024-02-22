import type { RequestHandler } from './$types';
import explore from './explore.json';
import { error, json, redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	try {
		return json(explore);

	} catch (err) {
		
		console.log('error fetch groups', err);
		return error(400, {
			message: 'Failed to fetch groups'
		});
	}
};
