import { type InsertGroup, type InsertOAuthAccount, type InsertUser, type SelectGroupOAuthAccount, type SelectSave, type SelectUser } from './schema';

import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { group, oauth_account, save, save_group_mm, user } from './schema';
import { generateId } from 'lucia';

export async function getSavesWithGroups(userId: SelectUser['id']) {
    const savesWithGroups = await db.query.save.findMany({
        where: (save, { eq }) => eq(save.userId, userId),
        with: {
            saveGroups: {
                with: {
                    group: true,
                    // group: {
                    //     orderBy: (group, { desc }) => [desc(group.title)]
                    // },
                },
            }
        }
    });

    savesWithGroups.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Sorting in descending order
    });

    return savesWithGroups;
}

export async function getSaveWithGroups(saveId: SelectSave['id']) {
    const saveWithGroups = await db.query.save.findFirst({
        where: (save, { eq }) => eq(save.id, saveId),
        with: {
            saveGroups: {
                with: {
                    group: true
                },
            }
        }
    });
    return saveWithGroups;
}

export async function getAllGroups(userId: SelectUser['id']) {
    // return await db.select().from(group).where(eq(group.userId, userId)).orderBy(group.sortIndex).all();
    const groupsWithSaves = await db.query.group.findMany({
        where: (group, { eq }) => eq(group.userId, userId),
        orderBy: (group, { asc }) => [asc(group.sortIndex)],
        with: {
            saves: {
                with: {
                    save: true
                },
            },
        },
    });

    groupsWithSaves.forEach(item => {
        if (item.saves.length === 0) return;
        item.saves.sort((a, b) => {
            const dateA = new Date(a.save.createdAt).getTime();
            const dateB = new Date(b.save.createdAt).getTime();
            return dateB - dateA; // Sorting in descending order
        });
    })

    return groupsWithSaves;
}

export async function updateGroup(id: InsertGroup['id'], data: Partial<InsertGroup>) {
    await db.update(group).set(data).where(eq(group.id, id));
}

export async function resetGroupSortIndex(userId: SelectUser['id']) {
    const groups = await getAllGroups(userId);
			
    let sortIndex = 100;
    for (const groupItem of groups) {
        await db.update(group).set({ sortIndex }).where(eq(group.id, groupItem.id));
        sortIndex += 100;
    }
}

export async function getNewGroupSortIndex(userId: SelectUser['id']) {
    let sortIndex;
    const highestSortIndexResult = await db.select({ sortIndex: group.sortIndex }).from(group).where(eq(group.userId, userId )).orderBy(desc(group.sortIndex)).limit(1);

    if (highestSortIndexResult.length === 0) {
        sortIndex = 100;
    } else {
        sortIndex = highestSortIndexResult[0].sortIndex + 100;
    }
    return sortIndex;
}

export async function deleteSave(id: SelectSave['id']) {
    await db.delete(save_group_mm).where(eq(save_group_mm.saveId, id));
    await db.delete(save).where(eq(save.id, id));
}

export async function createNewGroup(userId: InsertGroup['userId'], title: InsertGroup['title'], gradientIndex: InsertGroup['gradientIndex']) {
    const sortIndex = await getNewGroupSortIndex(userId);
    await db.insert(group).values({
        id: generateId(15),
        userId: userId,
        title: title,
        gradientIndex: gradientIndex,
        sortIndex: sortIndex,
    });
}

export async function deleteGroup(id: InsertGroup['id']) {
    await db.delete(save_group_mm).where(eq(save_group_mm.groupId, id));
    await db.delete(group).where(eq(group.id, id));
}

export async function createUser(provider: InsertOAuthAccount['provider'], providerId: InsertOAuthAccount['providerId'], userId: InsertUser['id'] | null = null, username: InsertUser['username'] = null, name: InsertUser['name'] = null, avatarUrl: InsertUser['avatarUrl'] = null) {
    if (userId === null) {
        userId = generateId(15);
    }
    await db.insert(user).values({
        id: userId,
        username: username ?? '',
        name: name ?? '',
        avatarUrl: avatarUrl ?? ''

    });
    await db.insert(oauth_account).values({
        provider: provider,
        providerId: providerId,
        userId: userId
    });
}

export async function getUserByProvider(provider: SelectGroupOAuthAccount['provider'], providerId: SelectGroupOAuthAccount['providerId']) {
    return await db.query.oauth_account.findFirst({
        where: and(eq(oauth_account.provider, provider), eq(oauth_account.providerId, providerId))
    });
}

export async function getUserProvider(userId: SelectUser['id']) {
    const oauthAccount = await db.select({ provider: oauth_account.provider }).from(oauth_account).where(eq(oauth_account.userId, userId)).limit(1);
    if (oauthAccount.length === 0) return null;
    return oauthAccount[0].provider;
}