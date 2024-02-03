import { db } from '$lib/server/db';
import { group } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';
import { error, json, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

    try {
        const groups = await db.select().from(group).where(eq(group.userId, locals.user.id)).all();
        return json(groups);
    } catch (err) {
        console.log('error fetch groups', err);
        return error(400, {
            message: 'Failed to fetch groups'
        });
    }

};