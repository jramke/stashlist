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

        //TODO: get groups of each saves

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

        // const userId = locals.user.id;
        // const savesByGroup = await db.query.save.findMany({
        //     where: (save, { eq }) => eq(save.userId, userId),
        //     with: {
        //         saveGroups: {
        //             with: {
        //                 group: {
        //                     // where: (group: { id: any; }, { eq }: any) => eq(group.id, currentGroup[0].id)
        //                     // where: (group, { lt }) => lt(group.createdAt, new Date()),
        //                     where: (group, { eq }) => eq(group.id, currentGroup[0].id)
        //                 }
        //             }
        //         },
        //     }
        // })

    } catch (err) {
        console.error('Error fetching saves by group', err);
        return {
            savesByGroup: null
        };
    }
};