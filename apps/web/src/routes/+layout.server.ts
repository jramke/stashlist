import { siteConfig } from '$lib/config/site';
import { getLatestReleaseByOS, getLatestReleases, getOS } from '$lib/helper/releases';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, route, request }) => {
	if (!locals.user && route.id?.includes(siteConfig.appUrl)) redirect(302, '/login');

	return {
		user: locals.user,
		os: getOS(request.headers.get('user-agent') ?? null),
		// releaseInfo: getLatestReleaseByOS('jramke/stashlist', request.headers.get('user-agent') ?? null),
	};
};
