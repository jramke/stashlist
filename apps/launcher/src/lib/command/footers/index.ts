import type { ComponentType } from "svelte";

import NewStashGroups from "./new-stash-groups.svelte";

type FooterComponents = {
    [key: string]: ComponentType;
}

export const footerComponents = {
    newStashGroups: NewStashGroups
} as const satisfies FooterComponents;