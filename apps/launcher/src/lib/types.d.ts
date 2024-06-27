import type { ComponentType } from "svelte";
import type { Icon } from "lucide-svelte";

export type CommandPage = {
    name: string;
    id: string;
    groupId?: string;
    placeholder?: string;
    preventFilter?: boolean;
    height?: number;
    icon?: ComponentType<Icon>;
    hideFooter?: boolean;
}