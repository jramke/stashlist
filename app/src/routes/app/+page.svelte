<script lang="ts">
	import LinkPreviewCard from '$lib/components/saves/LinkPreviewCard.svelte';
	import type { PageData } from './$types';
	import Heading from '$lib/components/Heading.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Dialog from '$lib/components/ui/dialog';
	import Button from '$lib/components/ui/button/button.svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	// import { Form } from '$lib/components/ui/form';

	export let data: PageData;

</script>

<div class="flex flex-wrap gap-6 items-center justify-between">
	<Heading tag="h1">Inspiration</Heading>
	<div>
		<Dialog.Root>
			<Dialog.Trigger class={buttonVariants({ variant: "default" })}>New stash</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>New stash</Dialog.Title>
					<Dialog.Description>New stash description</Dialog.Description>
				</Dialog.Header>
				<form method="POST" action="/api/saves/new" use:enhance>
					<input type="text" name="url" value="https://www.awwwards.com/">
					<Button type="submit">Save</Button>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>
</div>
{#await data.previewData}
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
	<p>Couldnt fetch stashes! {error.message}</p>
{/await}
