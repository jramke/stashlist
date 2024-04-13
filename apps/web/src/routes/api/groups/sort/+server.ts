import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { group } from '$lib/server/db/schema';
import { json, redirect, error } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';

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

			await db.update(group).set({ sortIndex }).where(eq(group.id, id));
			return json({ success: true });
		}
		
		if (type === 'reset') {
			const groups = await db.select({ id: group.id, sortIndex: group.sortIndex }).from(group).where(eq(group.userId, locals.user.id)).orderBy(group.sortIndex);
			
			let sortIndex = 100;
			for (const groupItem of groups) {
				await db.update(group).set({ sortIndex }).where(eq(group.id, groupItem.id));
				sortIndex += 100;
			}
			return json({ success: true });
		}

		throw Error('Invalid type searchparam');

	} catch (err) {
		console.log('error updating sort index for groups', err);
		// return json({ success: false });
		return error(400, 'Error updating sort index for groups');
	}
};
