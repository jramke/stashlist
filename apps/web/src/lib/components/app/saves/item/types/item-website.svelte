<script lang="ts">
	import type { SelectSave } from "$lib/server/db/schema";

	import ItemMedia from "../item-media.svelte";
	import { cleanUrl } from "$lib/utils";
	import ItemTitle from "../item-title.svelte";
	import ItemDescription from "../item-description.svelte";
	import ItemImage from "../item-image.svelte";
	import { liveView } from "$lib/stores";
    
    export let title: SelectSave['title'];
    export let imageUrl: SelectSave['imageUrl'];
    export let url: SelectSave['url'];
    export let gradientIndex: SelectSave['gradientIndex'];
    export let faviconUrl: SelectSave['faviconUrl'];

</script>

<ItemMedia>
    {#if $liveView}
        <div class="aspect-video relative overflow-hidden">
            <iframe title={title} src={url} class="absolute scale-[.5] w-[200%] -left-1/2 -top-1/2 aspect-video" tabindex="-1"></iframe>
        </div>
    {:else}
        <ItemImage {imageUrl} {title} {gradientIndex} />
    {/if}
</ItemMedia>
<div class="flex flex-col gap-1 min-w-0 w-full">
    <ItemTitle {title} {faviconUrl} {gradientIndex} />
    <ItemDescription>
        {cleanUrl(url)}
    </ItemDescription>
</div>