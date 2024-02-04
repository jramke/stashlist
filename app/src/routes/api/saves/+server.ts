import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { error, json, redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

    try {
        const userId = locals.user.id;
        const savesWithGroups = await db.query.save.findMany({
            where: (save, { eq }) => eq(save.userId, userId),
            with: {
                saveGroups: {
                    with: {
                        group: true
                    }
                },
            }
        })

        return json(savesWithGroups);
    } catch (err) {
        console.log('error fetch saves', err);
        return error(400, {
            message: 'Failed to fetch saves'
        });
    }

};