import type { PageServerLoad } from "./$types";

import { db } from '$lib/server/db';
import { save_group_mm, user, save, group } from "$lib/server/db/schema";
import { redirect } from "@sveltejs/kit";
import { eq, getTableColumns } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
    if (!locals.user) redirect(302, '/login');

    try {
        const currentGroup = await db.select().from(group).where(eq(group.slug, params.slug)).limit(1);

        if (currentGroup.length === 0) {
            throw new Error('Failed to fetch current group');
        }

        const savesByGroup = await db.select({...getTableColumns(save)})
            .from(save_group_mm)
            .innerJoin(user, eq(save_group_mm.userId, user.id))
            .innerJoin(group, eq(save_group_mm.groupId, group.id))
            .innerJoin(save, eq(save.id, save_group_mm.saveId))
            .where(eq(group.id, currentGroup[0].id))
            .all();

        return { 
            savesByGroup
        };
    } catch (err) {
        console.error('Error fetching saves by group', err);
        return {
            savesByGroup: null
        };
    }
};