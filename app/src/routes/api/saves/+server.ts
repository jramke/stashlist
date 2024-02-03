import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { save } from '$lib/server/db/schema';
import { error, json, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

    try {
        const saves = await db.select().from(save).where(eq(save.userId, locals.user.id)).all();
        return json(saves);
    } catch (err) {
        console.log('error fetch saves', err);
        return error(400, {
            message: 'Failed to fetch saves'
        });
    }

};