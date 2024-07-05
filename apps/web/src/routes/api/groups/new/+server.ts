import type { RequestHandler } from './$types';

import { json, redirect, error } from '@sveltejs/kit';
import { getRandomIndex } from '$lib/utils';
import { gradients } from '@repo/constants';
import { createNewGroup } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) redirect(302, '/login');

	const data = await request.json();

	try {
		const title = data['title'];
		if (title.length === 0) throw Error('Group title cant be empty');

		const gradientIndex = data['gradientIndex'] ?? getRandomIndex(gradients);

		await createNewGroup(locals.user.id, title, gradientIndex);

		return json({ success: true });
	} catch (err) {
		console.log('error create group', err);
		// return json({ success: false });
		return error(400, 'Failed to create group');
	}
};
