import type { ComponentType } from "svelte";
import Connect from "./connect.svelte";
import type { CommandPage } from "$lib/types";

type PageComponents = {
    [key: CommandPage['id']]: ComponentType;
}
export const pageComponents: PageComponents = {
    'connect': Connect,
};