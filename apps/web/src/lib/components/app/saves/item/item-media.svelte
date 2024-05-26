<script lang="ts">
    import type { Save } from '$lib/types';

    import { listLayout, liveView } from '$lib/stores';
	import { cn } from '@repo/ui/utils';
	import ItemImage from './item-image.svelte';

    export let type: Save['type'];
    export let title: Save['title'];
	export let imageUrl: Save['imageUrl'];
	export let url: Save['url'];
    export let gradientIndex: number;
    let className: string | undefined | null = undefined;
	export { className as class };

</script>

{#if $listLayout !== 'list'}
    <div class={cn("shadow-md rounded-sm shadow-[black] m-4 mb-0 border", className)}>
        <div class="overflow-hidden rounded-sm">
            {#if type === 'image'}
                <div class="flex">
                    {#if imageUrl}	
                        <img
                            loading="lazy"
                            src={imageUrl}
                            alt={title}
                            class="w-full"
                        />
                    {/if}
                </div>
            {:else}
                {#if $liveView}
                    <div class="aspect-video relative overflow-hidden">
                        <iframe title={title} src={url} class="absolute scale-[.5] w-[200%] -left-1/2 -top-1/2 aspect-video" tabindex="-1"></iframe>
                    </div>
                {:else}
                    <div class="relative flex aspect-og overflow-hidden">			
                        <ItemImage {imageUrl} {title} {gradientIndex} />
                    </div>
                {/if}
            {/if}
        </div>
    </div>
{/if}