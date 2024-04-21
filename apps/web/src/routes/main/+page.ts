import type { PageLoad } from './$types';

export const load = (async () => {
    return { title: 'All' };
}) satisfies PageLoad;