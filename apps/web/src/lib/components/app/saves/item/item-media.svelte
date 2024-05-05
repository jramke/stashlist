<script lang="ts">
    import type { Save } from '$lib/types';

    import { listLayout, liveView } from '$lib/stores';
	import { Gradient } from '$lib/components/app';
	import { onMount } from 'svelte';
	import { cn } from '@repo/ui/utils';

    export let type: Save['type'];
    export let title: Save['title'];
	export let imageUrl: Save['imageUrl'];
	export let url: Save['url'];
    export let gradientIndex: number;

    let image: HTMLImageElement;

    onMount(() => {
        if (image?.naturalHeight === 0 && image?.naturalWidth === 0 && image?.complete === true) {
            imageUrl = '';
        }
    });

</script>

<div class={cn("shadow-md rounded-sm shadow-[black]", $listLayout !== 'list' && "m-4 mb-0 border")}>
    <div class="overflow-hidden rounded-sm">
        {#if type === 'image'}
            <a
                href={imageUrl}
                {title}
                rel="norefferrer noopener"
                target="_blank"
                class="flex"
                tabindex="-1"
            >
                {#if imageUrl}	
                    <img
                        loading="lazy"
                        src={imageUrl}
                        alt={title}
                        class="w-full"
                    />
                {/if}
            </a>
        {:else}
            {#if $listLayout !== 'list'}
                {#if $liveView}
                    <div class="aspect-video relative overflow-hidden">
                        <iframe title={title} src={url} class="absolute scale-[.5] w-[200%] -left-1/2 -top-1/2 aspect-video" tabindex="-1"></iframe>
                    </div>
                {:else}
                    <a
                        href={url}
                        {title}
                        rel="norefferrer noopener"
                        target="_blank"
                        class="relative flex aspect-og overflow-hidden"
                        tabindex="-1"
                    >			
                        {#if imageUrl}
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
                    </a>
                {/if}
            {/if}
        {/if}
    </div>
</div>