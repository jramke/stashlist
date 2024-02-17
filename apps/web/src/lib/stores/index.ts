import { persisted } from 'svelte-persisted-store';

export const listColumns = persisted('stashlist-columns', 3);

export const listLayout = persisted('stashlist-layout', 'grid');