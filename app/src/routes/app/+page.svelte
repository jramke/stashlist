<script lang="ts">
    import LinkPreviewCard from "$lib/components/LinkPreview.svelte";
	import type { PageData } from "./$types";
	import Heading from "$lib/components/Heading.svelte";
    import { Skeleton } from "$lib/components/ui/skeleton";
    
    export let data: PageData;
    
</script>

<Heading tag="h1">Inspiration</Heading>
{#await data.previewData}
<div class="grid gap-6 grid-cols-3">
        {#each new Array(9) as _}
            <Skeleton class="aspect-4/3" />
        {/each}
    </div>
{:then items}
    {#if items?.length > 0}
        <div class="grid gap-6 grid-cols-3">
            {#each items as data}
                <LinkPreviewCard {...data} />
            {/each}
        </div>
    {/if}
{:catch error}
    <p>Couldnt fetch stashes! {error.message}</p>
{/await}
