import { writable } from "svelte/store";
import type { CommandPage } from "./types";

export const apiKey = writable('');
export const currentPage = writable<CommandPage|undefined>(undefined);

export const saves = writable<any[]>([]);
export const groups = writable<any[]>([]);
export const loading = writable(false);

export const newStashInputValue = writable('');
export const newStashSelectedGroups = writable<any[]>([]);