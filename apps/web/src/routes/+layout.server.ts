import { siteConfig } from '$lib/config/site';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, route }) => {
	if (!locals.user && route.id?.includes(siteConfig.appUrl)) redirect(302, '/login');

	return {
		user: locals.user,
	};
};
