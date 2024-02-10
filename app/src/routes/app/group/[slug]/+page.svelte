<script lang="ts">
	import { page } from '$app/stores';
	import LinkPreviewCard from '$lib/components/saves/LinkPreviewCard.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import Breadcrumb from "$lib/components/nav/Breadcrumb.svelte";
	
</script>

<Breadcrumb path={['Stashes', $page.data.currentGroup.title]} />

{#await $page.data.savesByGroup}
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
