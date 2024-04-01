<script lang="ts">
    import type { Save } from '$lib/types';

    import { listLayout } from '$lib/stores';
	import { Gradient } from '$lib/components/app';

    export let type: Save['type'];
    export let title: Save['title'];
	export let imageUrl: Save['imageUrl'];
	export let url: Save['url'];
    export let gradientIndex: number;

</script>

{#if type === 'image'}
    <a
        href={imageUrl}
        {title}
        rel="norefferrer noopener"
        target="_blank"
        class="flex overflow-hidden m-4 mb-0 rounded-sm"
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
        <a
            href={url}
            {title}
            rel="norefferrer noopener"
            target="_blank"
            class="relative flex aspect-og overflow-hidden m-4 mb-0 rounded-sm border"
        >			
            {#if imageUrl}
                <img
                    loading="lazy"
                    src={imageUrl}
                    alt={title}
                    class="absolute inset-0 h-full w-full object-cover"
                    on:error={() => imageUrl = ''}
                />
            {:else}
                <Gradient {gradientIndex} />
            {/if}
        </a>
    {/if}
{/if}