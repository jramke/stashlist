import type { ComponentType } from "svelte";
import type { Icon } from "lucide-svelte";
import { footerComponents } from "./command/footers";


export type CommandPage = {
    name: string;
    id: string;
    groupId?: string;
    placeholder?: string;
    preventFilter?: boolean;
    height?: number;
    icon?: ComponentType<Icon>;
    hideFooter?: boolean;
    footer?: keyof typeof footerComponents;
}

