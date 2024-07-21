import type { ComponentType } from "svelte";
import type { CommandPage } from "$lib/types";

import Connect from "./connect.svelte";
import NewStash from "./new-stash.svelte";
import NewStashGroups from "./new-stash-groups.svelte";

type PageComponents = {
    [key: CommandPage['id']]: ComponentType;
}
export const pageComponents: PageComponents = {
    'connect': Connect,
    'new-stash': NewStash,
    'new-stash-groups': NewStashGroups
};