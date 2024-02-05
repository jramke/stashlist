import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { save } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import { json, redirect } from '@sveltejs/kit';
import urlMetadata from 'url-metadata';
import { getDomainFromUrl, isImageUrl, isAbsoluteUrl, makeAbsoluteUrl } from '$lib/utils';

export const POST: RequestHandler = async ({ request, locals, params, url }) => {
	//TODO: try catch error handling

	if (!locals.user) redirect(302, '/login');
	const formData = await request.json();
	// const edit = url.searchParams.get('edit');

	const saveUrl = formData['url'];
	const metaData = await urlMetadata(saveUrl);

	let faviconUrl = (metaData.favicons[0]?.href || '') as string;

	if (isImageUrl(faviconUrl) && !isAbsoluteUrl(faviconUrl)) {
		console.log(faviconUrl);
		faviconUrl = makeAbsoluteUrl(faviconUrl, getDomainFromUrl(saveUrl));
	}

	const imageUrl = metaData['og:image'];
	const description = metaData.description || '';
	const title = metaData.title || metaData.name || saveUrl;

	// if (edit) {
	//     return json({
	//         url: saveUrl,
	//         title: title,
	//         faviconUrl: faviconUrl
	//     })
	// }

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
};
