import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { save } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import { error, json, redirect } from '@sveltejs/kit';
import urlMetadata from 'url-metadata';
import { getDomainFromUrl, isImageUrl, isAbsoluteUrl, makeAbsoluteUrl } from '$lib/utils';

export const POST: RequestHandler = async ({ request, locals, params, url }) => {
	//TODO: try catch error handling

	if (!locals.user) redirect(302, '/login');	
	try {
		const formData = await request.json();
		const edit = url.searchParams.get('edit');

		const saveUrl = formData['url'];
		const metaData = await urlMetadata(saveUrl);

		let faviconUrl = (metaData.favicons[0]?.href || '') as string;

		if (isImageUrl(faviconUrl) && !isAbsoluteUrl(faviconUrl)) {
			faviconUrl = makeAbsoluteUrl(faviconUrl, getDomainFromUrl(saveUrl));
		}

		const imageUrl = metaData['og:image'];
		const description = metaData.description || '';
		const title = metaData.title || metaData.name || saveUrl;

		if (edit) {
		    return json({
		        url: { label: 'Url', data: saveUrl },
		        title: { label: 'Title', data: title },
				description: { label: 'Description', data: description },
				imageUrl: { label: 'Image url', data: imageUrl },
		        faviconUrl: { label: 'Favicon url', data: faviconUrl }
		    })
		}

		await db.insert(save).values({
			id: generateId(15),
			userId: locals.user.id,
			url: saveUrl,
			faviconUrl: faviconUrl,
			title: title,
			description: description,
			imageUrl: imageUrl
		});

		return json({ success: true });

	} catch (err) {
		console.log('error create save', err);
		return error(400, {
			message: 'Failed to create save'
		});
	}
	
};
