import { db } from '$lib/server/db';
import { save } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import type { RequestHandler } from './$types';
import { json, redirect } from '@sveltejs/kit';
// import { events } from 'sveltekit-sse';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) redirect(302, '/login');

    const formData = await request.formData();
    console.log(formData);
    
    const url = String(formData.get('url'));

    await db.insert(save).values({
        id: generateId(15),
        userId: locals.user.id,
        url: url,
    })

    return json({ success: true });
    // return events({
    //     request,
    //     start({ emit }) {
    //         emit('message', 'hello world');
    //     },
    // })
};
