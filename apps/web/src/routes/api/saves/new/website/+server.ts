import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { save, group } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import { error, json, redirect } from '@sveltejs/kit';
import { getRandomIndex } from '$lib/utils';
import { eq } from 'drizzle-orm';
import { gradients } from '@repo/constants';
import { createSaveGroupsRelations } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request, locals, params, url, fetch }) => {
	if (!locals.user) redirect(302, '/login');
	
	try {
		const formData = await request.json();
		const edit = url.searchParams.get('edit');
		const fetchMetaData = url.searchParams.get('fetchMetaData');
		
		const currentTime = new Date().toISOString();

		console.log('formData', formData);

		const saveUrl = formData['url'];
		const id = generateId(15);
		const gradientIndex = getRandomIndex(gradients);
		let groups = formData['groups'] || '';
		
		if (saveUrl && fetchMetaData === 'false') {
			console.log('inserting into db without fetching metadata');
			await db.insert(save).values({
				id: id,
				type: 'website',
				userId: locals.user.id,
				url: saveUrl,
				faviconUrl: formData['faviconUrl'] || '',
				title: formData['title'] || '',
				description: formData['description'] || '',
				imageUrl: formData['imageUrl'] || '',
				gradientIndex: gradientIndex,
				createdAt: currentTime
			});

			if (groups) {
				await createSaveGroupsRelations(groups.split(','), id, locals.user.id);
			}
	
			return json({ success: true });
		}

		const metaDataResponse = await fetch('/api/saves/metadata', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ url: saveUrl })
		});
		const { title, description, imageUrl, faviconUrl } = await metaDataResponse.json();

		if (edit) {
			const groups = await db.select().from(group).where(eq(group.userId, locals.user.id)).all();
			console.log('returning edit json');
		    return json({
				type: 'website',
				form: {
					title: { label: 'Title', data: title, error: null, hidden: false },
					description: { label: 'Description', data: description, error: null, hidden: false },
					url: { label: 'Url', data: saveUrl, error: null, hidden: false },
					imageUrl: { label: 'Image url', data: imageUrl, error: null, hidden: true },
					faviconUrl: { label: 'Favicon url', data: faviconUrl, error: null, hidden: true },
					groups: { label: 'Groups', data: '', error: null, hidden: false }
				},
				groups: groups,
		    })
		}

		console.log('inserting into db with fetching metadata');

		await db.insert(save).values({
			id: id,
			userId: locals.user.id,
			type: 'website',
			url: saveUrl,
			faviconUrl: faviconUrl,
			title: title,
			description: description,
			imageUrl: imageUrl,
			gradientIndex: gradientIndex,
			createdAt: currentTime
		});

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