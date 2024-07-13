import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { save } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import { error, json, redirect } from '@sveltejs/kit';
import { getRandomIndex } from '$lib/utils';
import { createSaveGroupsRelations } from '$lib/server/db/queries';
import { gradients } from '@repo/constants';

export const POST: RequestHandler = async ({ request, locals, params, url }) => {
	if (!locals.user) redirect(302, '/login');
	
	try {
		const formData = await request.json();
		
		const text = formData['text'];
		
		if (!text) throw Error('No text provided.');

		const currentTime = new Date().toISOString();
		const id = generateId(15);
        const gradientIndex = getRandomIndex(gradients);
		
		await db.insert(save).values({
			id: id,
			userId: locals.user.id,
			type: 'text',
			title: formData['title'] || '',
			// description: formData['description'] || '',
			text: text,
            gradientIndex: gradientIndex,
			createdAt: currentTime
		});

		let groups = formData['groups'] || '';
		if (groups) {
            await createSaveGroupsRelations(groups.split(','), id, locals.user.id);
        }

		return json({ success: true });

	} catch (err) {
		console.log('error create save', err);
		return error(400, {
			message: 'Failed to create save'
		});
	}
	
};