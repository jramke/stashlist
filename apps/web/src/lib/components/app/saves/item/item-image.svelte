<script lang="ts">
	import type { SelectSave } from "$lib/server/db/schema";
	import { onMount } from "svelte";
    import { Gradient } from '$lib/components/app';

    export let imageUrl: SelectSave['imageUrl']; 
    export let gradientIndex: SelectSave['gradientIndex'];
    export let title: SelectSave['title'] = '';
    export let absolute = false;

    const imageClass = absolute ? 
        'absolute inset-0 h-full w-full object-cover bg-muted' : 
        'w-full relative after:content-[""] after:bg-muted after:absolute after:inset-0 after:h-full after:w-full';

    let image: HTMLImageElement;

    onMount(() => {
        if (image?.naturalHeight === 0 && image?.naturalWidth === 0 && image?.complete === true) {
            imageUrl = '';
        }
    });

</script>

{#if imageUrl}
    {#if absolute}
        <div class="absolute inset-0 h-full w-full object-cover bg-muted"></div>
    {/if}
    <img
        loading="lazy"
        src={imageUrl}
        alt={title}
        bind:this={image}
        class={imageClass}
        on:error={() => imageUrl = ''}
    />
{:else}
    <div class="relative aspect-og">
        <Gradient {gradientIndex} />
    </div>
{/if}