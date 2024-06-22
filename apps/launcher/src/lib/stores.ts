import { writable } from "svelte/store";
import type { CommandPage } from "./types";

export const apiKey = writable('');
export const currentPage = writable<CommandPage|undefined>(undefined);