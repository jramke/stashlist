import { generateId } from 'lucia';
import type { RequestHandler } from './$types';
import { error, json, redirect } from '@sveltejs/kit';
import { updateUser } from '$lib/server/db/queries';
import { Argon2id } from "oslo/password";

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const encodedUserName = encodeURIComponent(locals.user.username);
    const apiKey = encodedUserName + '-' + generateId(30);
	
	const argon2id = new Argon2id();
	const hash = await argon2id.hash(apiKey);

    await updateUser(locals.user.id, { apiKeyHash: hash });

	try {
		return json({ apiKey });
	} catch (err) {
		console.log('error generating api key', err);
		return error(400, {
			message: 'Failed to generate API Key'
		});
	}
};
