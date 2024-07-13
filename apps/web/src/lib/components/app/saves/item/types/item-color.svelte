<script lang="ts">
	import type { SelectSave } from "$lib/server/db/schema";
	import ItemDescription from "../item-description.svelte";
	import ItemMedia from "../item-media.svelte";
	import ItemTitle from "../item-title.svelte";
    
    export let title: SelectSave['title'];
    export let description: SelectSave['description'];

</script>

<ItemMedia>
    <div class="relative flex aspect-og overflow-hidden" style={`background-color: ${title}`}></div>
</ItemMedia>
<div class="flex flex-col gap-1 min-w-0 w-full">
    <ItemTitle title={title} color={title} />
    {#if description}
        <ItemDescription>
            {description}
        </ItemDescription>
    {/if}
</div>