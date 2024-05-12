import type { PageLoad } from './$types';

export const load = (async () => {
    return { title: 'Groups' };
}) satisfies PageLoad;