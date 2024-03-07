import type { RequestHandler } from "./$types";

import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { page_views } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async (event) => {
    try {
        
        const { slug } = await event.request.json();
        const type = event.url.searchParams.get('type');
        console.log(slug, type);

        // use abstraction like lucia

        const user_agent = event.request.headers.get('user-agent');
        const referrer = event.request.headers.get('referer');
        const request_ip = event.getClientAddress();
        console.log(user_agent);
        console.log(referrer);
        console.log(request_ip);

        // BY USER -> create page_views table
        // BY USER -> update or set page_views table for slug

        const pageViews = await db.query.page_views.findFirst({
            where: (page_views, { eq }) => eq(page_views.slug, slug),
        });

        if (pageViews) {
            const count = pageViews.count;
            await db.update(page_views).set({ count: count + 1 }).where(eq(page_views.slug, slug));
        } else {
            await db.insert(page_views).values({
                count: 1,
                slug: slug,
            });
        }
        
		return json({ success: true });

	} catch (err) {
		
		console.error('error analytics', err);
		return error(400, {
			message: 'Error with analytics'
		});
	}
};

export const GET: RequestHandler = async () => {
    try {
		const pageViews = await db.select().from(page_views).all();
		return json(pageViews);
	} catch (err) {
		console.error('Error fetching page views', err);
		return error(400, {
			message: 'Failed to fetch page views'
		});
	}
}