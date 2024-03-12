import type { RequestHandler } from "./$types";

import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { page_views, page_visitors } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { generateUniqueID } from "@repo/analytics/utils";


export const POST: RequestHandler = async (event) => {
    try {
        
        const { slug } = await event.request.json();

        if (slug === '/analytics') {
            return json({
                message: 'Tracking for the Dashboard is disabled'
            });
        }

        const type = event.url.searchParams.get('type');

        const userAgent = event.request.headers.get('user-agent');
        const referrer = event.request.headers.get('referer');
        const ipAddress = event.getClientAddress();

        let pageVisitor;

        const existingPageVisitor = await db.query.page_visitors.findFirst({
            where: (page_visitors, { eq }) => eq(page_visitors.ipAddress, ipAddress)
        })

        type NewPageVisitor = typeof page_visitors.$inferInsert;
        let newPageVisitor: NewPageVisitor;

        if (existingPageVisitor) {
            pageVisitor = existingPageVisitor;
        } else {
            const insert = await db.insert(page_visitors).values({
                id: generateUniqueID(),
                ipAddress: ipAddress,
                userAgent: userAgent,
            }).returning();
            newPageVisitor = insert[0]
            pageVisitor = newPageVisitor;
        }
        
        await db.insert(page_views).values({
            id: generateUniqueID(),
            visitorId: pageVisitor.id,
            referrer: referrer,
            slug: slug,
        });
        
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
        const pageVisitors = await db.select().from(page_visitors).all();

        // sort pageViews by count
        // pageViews.sort((a, b) => b.count - a.count);

		return json({
            pageViews: pageViews,
            pageVisitors: pageVisitors
        });
	} catch (err) {
		console.error('Error fetching page views', err);
		return error(400, {
			message: 'Failed to fetch page views'
		});
	}
}