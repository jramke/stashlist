<script lang="ts">
	import { onMount } from "svelte";
    import { Gradient } from '$lib/components/app';

    export let imageUrl: string; 
    export let title: string;
    export let gradientIndex: number;

    let image: HTMLImageElement;

    onMount(() => {
        if (image?.naturalHeight === 0 && image?.naturalWidth === 0 && image?.complete === true) {
            imageUrl = '';
        }
    });

</script>

{#if imageUrl}
    <div class="absolute inset-0 h-full w-full object-cover bg-muted"></div>
    <img
        loading="lazy"
        src={imageUrl}
        alt={title}
        bind:this={image}
        class="absolute inset-0 h-full w-full object-cover"
        on:error={() => imageUrl = ''}
    />
{:else}
    <Gradient {gradientIndex} />
{/if}