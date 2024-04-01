import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { group } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import { json, redirect, error } from '@sveltejs/kit';
import { getRandomIndex } from '$lib/utils';
import { gradients } from '$lib/constants';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) redirect(302, '/login');

	const data = await request.json();

	try {
		const title = data['title'];
		if (title.length === 0) throw Error('Group title cant be empty');

		const gradientIndex = data['gradientIndex'] ?? getRandomIndex(gradients);

		//TODO: handle parent id, index

		await db.insert(group).values({
			id: generateId(15),
			userId: locals.user.id,
			title: title,
			gradientIndex: gradientIndex,
		});

		return json({ success: true });
	} catch (err) {
		console.log('error create group', err);
		// return json({ success: false });
		return error(400, 'Failed to create group');
	}
};
