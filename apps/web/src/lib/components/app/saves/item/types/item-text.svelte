<script lang="ts">
	import type { SelectSave } from "$lib/server/db/schema";
	import { Type } from "@repo/ui/icons";
	import ItemDescription from "../item-description.svelte";
	import ItemTitle from "../item-title.svelte";
	import { cn } from "@repo/ui/utils";
	import { listLayout } from "$lib/stores";
    
    export let text: SelectSave['text'];
    export let title: SelectSave['title'];

</script>

<div class="flex flex-col gap-1 min-w-0 w-full">
    <ItemTitle title={title || text} class={$listLayout !== 'list' ? "line-clamp-none whitespace-pre-line" : ""} let:titleIconClass>
        <div class={cn(titleIconClass, "flex items-center justify-center bg-white")}>
            <Type class="size-3.5 text-background" />
        </div>
    </ItemTitle>
    {#if text && title}
        <ItemDescription class={$listLayout !== 'list' ? "line-clamp-none max-w-none whitespace-pre-line" : ""}>
            {text}
        </ItemDescription>
    {/if}
</div>