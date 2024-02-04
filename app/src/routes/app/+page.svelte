<script lang="ts">
	import LinkPreviewCard from '$lib/components/saves/LinkPreviewCard.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { page } from '$app/stores';

	$inspect($page.data.saves);
</script>

<div class="flex flex-wrap gap-6 items-center justify-between">
	<Heading tag="h1">All stashes</Heading>
</div>
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
