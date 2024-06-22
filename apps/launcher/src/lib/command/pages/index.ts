import type { ComponentType } from "svelte";
import Connect from "./connect.svelte";

type PageComponents = {
    [key: string]: ComponentType;
}
export const pageComponents: PageComponents = {
    'connect': Connect,
};