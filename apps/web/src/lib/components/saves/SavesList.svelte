<script lang="ts">
    import LinkPreviewCard from '$lib/components/saves/LinkPreviewCard.svelte';
	import { page } from '$app/stores';
	import { Skeleton } from '@repo/ui/components/skeleton';
    import { listColumns } from '$lib/stores';
	import type { Save } from '$lib/types';
	import Masonry from '@repo/ui/components/masonry';
	import { listLayout } from '$lib/stores';

    type SaveListOptions = 'all' | 'savesByGroup' | 'unsorted';
    export let saves: SaveListOptions = 'all';

    $: saveOption = {
        'all': $page.data.saves.then(saves => saves.items),
        'savesByGroup': $page.data.savesByGroup,
        'unsorted': $page.data.saves.then(saves => saves.items.filter(save => save.saveGroups.length === 0)),
    }
	

</script>

<div class="hidden grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5"></div>

{#await saveOption[saves]}
	<div class="grid grid-cols-{$listColumns} gap-6">
		{#each new Array(9) as _}
			<Skeleton class="aspect-video" />
		{/each}
	</div>
{:then items}
    {#if items?.length > 0}
		{#if $listLayout === 'masonry'}
			<Masonry gapSize={6} columns={$listColumns} items={items}>
				{#each items as {title, description, url, imageUrl, faviconUrl, createdAt, saveGroups, id, type}}
					<LinkPreviewCard {title} {description} {url} {imageUrl} {faviconUrl} {createdAt} {saveGroups} {id} {type} />
				{/each}
			</Masonry>
		{:else}
			<div class="grid grid-cols-{$listColumns} gap-6">
				{#each items as {title, description, url, imageUrl, faviconUrl, createdAt, saveGroups, id, type}}
					<LinkPreviewCard {title} {description} {url} {imageUrl} {faviconUrl} {createdAt} {saveGroups} {id} {type} />
				{/each}
			</div>
		{/if}
	{/if}
{:catch error}
	<p>Couldnt fetch stashes!</p>
{/await}