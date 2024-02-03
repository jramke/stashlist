import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { group } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import { json, redirect } from '@sveltejs/kit';
import { slugify } from '$lib/utils';

export const POST: RequestHandler = async ({ request, locals, params, url }) => {
    if (!locals.user) redirect(302, '/login');
    const formData = await request.formData();
    
    const title = formData.get('title') as string;
    const slug = slugify(title);

    //TODO: handle parent id, index

    await db.insert(group).values({
        id: generateId(15),
        userId: locals.user.id,
        title: title,
        slug: slug
    })

    return json({ success: true });
};
