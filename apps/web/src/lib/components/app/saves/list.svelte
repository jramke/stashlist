<script lang="ts">
	import type { Save } from '$lib/types';

	import { page } from '$app/stores';
	import { siteConfig } from '$lib/config/site';
	import { listLayout, listColumns } from '$lib/stores';
	import { EmptyState } from '$lib/components/app';
    import { Item } from '$lib/components/app/saves';
	import { Skeleton } from '@repo/ui/components/skeleton';
	import Masonry from '@repo/ui/components/masonry';
	import { Button } from '@repo/ui/components/button';
	import { onMount } from 'svelte';

    type SaveListOptions = 'all' | 'savesByGroup' | 'unsorted';
    export let saves: SaveListOptions = 'all';

    $: saveOption = {
        'all': getAll(),
        'savesByGroup': $page.data.savesByGroup,
        'unsorted': getUnsorted(),
    }

	let hasStashes: boolean;
	$: (async() => hasStashes = (await getAll()).length > 0)();

	async function getAll() {
		const items = (await $page.data.saves)?.items || [];
		if (!items || items.length === 0) return [];
		return items;
	}

	async function getUnsorted() {
		const items = (await $page.data.saves)?.items || [];
		if (!items || items.length === 0) return [];
		return items.filter(save => save.saveGroups.length === 0);
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
					<Item {title} {description} {url} {imageUrl} {faviconUrl} {createdAt} {saveGroups} {id} {type} />
				{/each}
			</Masonry>
		{:else}
			<div class="grid grid-cols-{$listColumns} gap-6">
				{#each items as {title, description, url, imageUrl, faviconUrl, createdAt, saveGroups, id, type}}
					<Item {title} {description} {url} {imageUrl} {faviconUrl} {createdAt} {saveGroups} {id} {type} />
				{/each}
			</div>
		{/if}
	{:else}
		{#if saves === 'unsorted' && hasStashes}
			<EmptyState title="Everything is clean" message="You seem very organized. All your stashes are stored in groups.">
				<Button href={siteConfig.appUrl} variant="outline">View all stashes</Button>
			</EmptyState>
		{:else}
			<EmptyState title="No stashes found" message="Your stashes will be dispayed here. Download the extension to easily stash your items.">
				<Button href="/extension" variant="outline">Get the extension</Button>
			</EmptyState>
		{/if}
	{/if}
{:catch error}
	<p>Couldnt fetch stashes!</p>
{/await}