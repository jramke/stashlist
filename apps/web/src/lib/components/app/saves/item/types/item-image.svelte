<script lang="ts">
	import type { SelectSave } from "$lib/server/db/schema";

    import ItemMedia from "../item-media.svelte";
	import ItemTitle from "../item-title.svelte";
	import ItemDescription from "../item-description.svelte";
	import ItemImage from "../item-image.svelte";
	import { cn } from "@repo/ui/utils";

    export let title: SelectSave['title'];
    export let imageUrl: SelectSave['imageUrl'];
    export let gradientIndex: SelectSave['gradientIndex'];
    export let description: SelectSave['description'];
    
</script>

<ItemMedia>
    <ItemImage {imageUrl} {title} {gradientIndex} />
</ItemMedia>
<div class="flex flex-col gap-1 min-w-0 w-full">
    <ItemTitle {title} let:titleIconClass>
        <div class={cn(titleIconClass)}>
            <ItemImage {imageUrl} {title} {gradientIndex} absolute={true} />
        </div>
    </ItemTitle>
    {#if description}
        <ItemDescription>
            {description}
        </ItemDescription>
    {/if}
</div>