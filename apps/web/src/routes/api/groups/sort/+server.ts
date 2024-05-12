import type { RequestHandler } from './$types';

import { json, redirect, error } from '@sveltejs/kit';
import { resetGroupSortIndex, updateGroup } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user) redirect(302, '/login');

	const type = url.searchParams.get('type');
	
	try {
		if (!type) throw Error('Type searchparam is required');

		if (type === 'update') {
			const data = await request.json();

			const id = data['id'];
			const sortIndex = data['sortIndex'];
	
			if (!id || typeof sortIndex === 'undefined') throw Error('Group id and sort index are required');

			await updateGroup(id, { sortIndex });
			return json({ success: true });
		}
		
		if (type === 'reset') {
			await resetGroupSortIndex(locals.user.id);
			return json({ success: true });
		}

		throw Error('Invalid type searchparam');

	} catch (err) {
		console.log('error updating sort index for groups', err);
		// return json({ success: false });
		return error(400, 'Error updating sort index for groups');
	}
};
