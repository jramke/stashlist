import { persisted } from 'svelte-persisted-store';
import { writable } from 'svelte/store';

import { newStashStore } from './new-stash';

export const listColumns = persisted('stashlist-columns', 3);

type ListLayout = 'grid' | 'list' | 'masonry';
export const listLayout = persisted<ListLayout>('stashlist-layout', 'grid');

export const commandMenuOpen = writable(false);

export const liveView = writable(false);

export const editGroupsDialogOpen = writable(false);

export const newGroupDialogOpen = writable(false);

export const editStashDialogOpen = writable(false);

export { newStashStore };