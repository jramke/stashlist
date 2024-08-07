import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { save, group } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import { error, json, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createSaveGroupsRelations } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request, locals, params, url }) => {
	if (!locals.user) redirect(302, '/login');
	
	try {
		const formData = await request.json();
		
		const imageUrl = formData['imageUrl'];
		
		if (!imageUrl) throw Error('No image url provided.');
		
		const edit = url.searchParams.get('edit');
		if (edit) {
			const groups = await db.select().from(group).where(eq(group.userId, locals.user.id)).all();

			const title = imageUrl.split('/').pop().split('.')[0];

		    return json({
				type: 'image',
				form: {
					title: { label: 'Title', data: title, error: null, hidden: false },
					description: { label: 'Description', data: '', error: null, hidden: false },
					imageUrl: { label: 'Image url', data: imageUrl, error: null, hidden: true },
					groups: { label: 'Groups', data: '', error: null, hidden: false }
				},
				groups: groups,
		    })
		}

		const currentTime = new Date().toISOString();
		const id = generateId(15);
		
		await db.insert(save).values({
			id: id,
			userId: locals.user.id,
			type: 'image',
			title: formData['title'] || '',
			description: formData['description'] || '',
			imageUrl: imageUrl,
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