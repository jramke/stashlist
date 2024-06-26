import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { oauth_account } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getUserProvider } from '$lib/server/db/queries';

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
	if (!locals.user) redirect(302, '/login');

	async function getGroups() {
		try {
			const response = await fetch('/api/groups');
			if (!response.ok) {
				throw new Error(`Error getting groups. Status: ${response.status}`);
			}
			const groups = await response.json();
			return groups;
		} catch (error) {
			console.log('Error getting groups', error);
			return null;
		}
	}

	async function getSaves() {
		try {
			const response = await fetch('/api/saves');
			if (!response.ok) {
				throw new Error(`Error getting saves. Status: ${response.status}`);
			}
			//TODO use the new counts
			const saveData = await response.json();
			
			return {
				items: saveData.saves,
				groupCounts: saveData.groupCounts,
				noGroupCount: saveData.noGroupCount
			};
		} catch (error) {
			console.log('Error getting saves', error);
			return {
				items: null,
				groupCounts: null,
				noGroupCount: null
			};
		}
	}

	return {
		groups: await getGroups(),
		saves: await getSaves(),
		userProvider: await getUserProvider(locals.user?.id)
	};
};
