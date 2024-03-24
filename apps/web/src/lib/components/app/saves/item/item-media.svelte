<script lang="ts">
    import type { Save } from '$lib/types';

    import { listLayout } from '$lib/stores';

    export let type: Save['type'];
    export let title: Save['title'];
	export let imageUrl: Save['imageUrl'];
	export let url: Save['url'];

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
                <div class="absolute inset-0 h-full w-full bg-gradient-to-br from-primary from-10% to-[#fcb8d8] to-90%"></div>
            {/if}
        </a>
    {/if}
{/if}