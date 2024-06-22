import type { ComponentType } from "svelte";

export type CommandPage = {
    name: string;
    groupId?: string;
    placeholder?: string;
    preventFilter?: boolean;
    height?: number;
    icon?: ComponentType;
}