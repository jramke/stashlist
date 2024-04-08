import { persisted } from 'svelte-persisted-store';
import { writable } from 'svelte/store';

export const listColumns = persisted('stashlist-columns', 3);

export const listLayout = persisted('stashlist-layout', 'grid');

export const commandMenuOpen = writable(false);