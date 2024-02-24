import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { save, save_group_mm, group } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import { error, json, redirect } from '@sveltejs/kit';
import urlMetadata from 'url-metadata';
import { getDomainFromUrl, isImageUrl, isAbsoluteUrl, makeAbsoluteUrl } from '$lib/utils';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals, params, url }) => {
	if (!locals.user) redirect(302, '/login');
	console.log(locals);
	
	try {
		const formData = await request.json();
		const edit = url.searchParams.get('edit');

		const currentTime = new Date().toISOString();

		const saveUrl = formData['url'];
		
		let hasOtherProperties = false;
		for (let key in formData) {
			if (key !== 'url') {
				hasOtherProperties = true;
				break;
			}
		}
		if (saveUrl && hasOtherProperties) {
			const id = generateId(15);
			await db.insert(save).values({
				id: id,
				userId: locals.user.id,
				url: saveUrl,
				faviconUrl: formData['faviconUrl'],
				title: formData['title'],
				description: formData['description'],
				imageUrl: formData['imageUrl'],
				createdAt: currentTime
			});

			let groups = formData['groups'] || [];
			groups = groups.split(',');
			if (groups.length > 0) {
				for (const groupId of groups) {
					if (groupId.length === 0) continue;
					await db.insert(save_group_mm).values({
						userId: locals.user?.id as string,
						saveId: id,
						groupId: groupId
					})
				}
			}
	
			return json({ success: true });
		}

		const metaData = await urlMetadata(saveUrl);

		let faviconUrl = (metaData.favicons[0]?.href || '') as string;

		if (isImageUrl(faviconUrl) && !isAbsoluteUrl(faviconUrl)) {
			faviconUrl = makeAbsoluteUrl(faviconUrl, getDomainFromUrl(saveUrl));
		}

		const imageUrl = metaData['og:image'];
		const description = metaData.description || '';
		const title = metaData.title || metaData.name || saveUrl;

		if (edit) {
			const groups = await db.select().from(group).where(eq(group.userId, locals.user.id)).all();
		    return json({
				form: {
					title: { label: 'Title', data: title, error: null },
					description: { label: 'Description', data: description, error: null },
					url: { label: 'Url', data: saveUrl, error: null },
					imageUrl: { label: 'Image url', data: imageUrl, error: null },
					faviconUrl: { label: 'Favicon url', data: faviconUrl, error: null },
					groups: { label: 'Groups', data: '', error: null }
				},
				groups: groups,
		    })
		}

		await db.insert(save).values({
			id: generateId(15),
			userId: locals.user.id,
			url: saveUrl,
			faviconUrl: faviconUrl,
			title: title,
			description: description,
			imageUrl: imageUrl,
			createdAt: currentTime
		});

		return json({ success: true });

	} catch (err) {
		console.log('error create save', err);
		return error(400, {
			message: 'Failed to create save'
		});
	}
	
};