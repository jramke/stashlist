import type { PageLoad } from './$types';

export const load = (async () => {
    return { title: 'Extension' };
}) satisfies PageLoad;