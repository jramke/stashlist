import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { save } from '$lib/server/db/schema';
import { error, json, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
	if (!locals.user) redirect(302, '/login');
	
	try {
		const data = await request.json();
		const saveId = data['id'];

		if (!saveId) {
			return error(400, {
				message: 'Invalid save id'
			});
		}

		const saveItem = await db.query.save.findFirst({
			where: (save, { eq }) => eq(save.id, saveId),
		});

		const metaDataResponse = await fetch('/api/saves/metadata', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ url: saveItem?.url })
		});
		const { title, description, imageUrl, faviconUrl } = await metaDataResponse.json(); 

		await db.update(save)
				.set({
					title,
					description,
					imageUrl,
					faviconUrl
				}).where(eq(save.id, saveId));

		return json({ success: true });

	} catch (err) {
		console.log('error update save metadata', err);
		return error(400, {
			message: 'Failed to update save metadata'
		});
	}
	
};