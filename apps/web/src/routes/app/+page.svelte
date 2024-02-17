<script lang="ts">
	import LinkPreviewCard from '$lib/components/saves/LinkPreviewCard.svelte';
	import Heading from '@ui/components/ui/heading';
	import { Skeleton } from '@ui/components/ui/skeleton';
	import { page } from '$app/stores';
	import type { PageData } from '../$types';
	import Breadcrumb from '$lib/components/nav/Breadcrumb.svelte';

	// export let data: PageData;
	// const { data } = $props<PageData>()
</script>

<!-- <div class="flex flex-wrap items-center justify-between gap-6">
	<Breadcrumb path={['Stashes', 'All']} />
</div> -->
{#await $page.data.saves}
	<div class="grid grid-cols-3 gap-6">
		{#each new Array(9) as _}
			<Skeleton class="aspect-4/3" />
		{/each}
	</div>
{:then items}
	{#if items?.length > 0}
		<div class="grid grid-cols-3 gap-6">
			{#each items as data}
				<LinkPreviewCard {...data} />
			{/each}
		</div>
	{/if}
{:catch error}
	<p>Couldnt fetch stashes!</p>
{/await}
