import type { RequestHandler } from './$types';

import { error, json, redirect } from '@sveltejs/kit';
import { deleteSave } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');

	try {
		const saveId = params.id;
		console.log('delete save', saveId);
		await deleteSave(saveId);
		return json({ success: true });
	} catch (err) {
		console.log('error delete save', err);
		return error(400, {
			message: 'Failed to delete save'
		});
	}
};

