<script lang="ts">
	import type { Save } from '$lib/types';
	import type { SubmitFunction } from '@sveltejs/kit';

	import { page } from '$app/stores';
	import { invalidateAll, pushState } from '$app/navigation';
	import { siteConfig } from '$lib/config/site';
	import { listLayout, listColumns, editStashDialogOpen } from '$lib/stores';
	import { EmptyState } from '$lib/components/app';
    import { Item } from '$lib/components/app/saves';
	import { Skeleton } from '@repo/ui/components/skeleton';
	import Masonry from '@repo/ui/components/masonry';
	import { Button, buttonVariants } from '@repo/ui/components/button';
	import * as AlertDialog from "@repo/ui/components/alert-dialog";
	import EditForm from '$routes/main/save/edit/[id]/+page.svelte';
	import { gridArrowKeys } from './grid-arrow-keys-action';
	import { applyAction, enhance } from '$app/forms';
	import { getItemsContext, setItemsContext } from './item/context';
	import { toast } from '@repo/ui/components/sonner';

    type SaveListOptions = 'all' | 'savesByGroup' | 'unsorted';
    export let saves: SaveListOptions = 'all';

	setItemsContext();

	const { deleteDialogOpen, itemToDelete } = getItemsContext();

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

	async function editDialogChange(open: boolean) {
		if (!open) {
			await invalidateAll(); // if this is not there error: "pushstate Could not serialize state.form"
			history.back();
			// editStashDialogOpen.set(false);
			// pushState($page.url.href, { editStash: undefined })
		}
	}

	const handleDelete: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success') {
				await applyAction(result);
				invalidateAll();
				toast.success('Successfully deleted stash');
			} else {
				toast.error('Failed to delete stash');
			}
			itemToDelete.set(null);
		};
	};


</script>

<div class="hidden grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5"></div>

{#await saveOption[saves]}
	<div class="grid grid-cols-{$listColumns} gap-6 self-start">
		{#each new Array(9) as _}
			<Skeleton class="aspect-video" />
		{/each}
	</div>
{:then items}
	{#if items?.length > 0}
		<div class="self-start">
			{#if $listLayout === 'masonry'}
			<div use:gridArrowKeys={{ selector: '[data-grid-item]' }}>
				<Masonry gapSize={6} columns={$listColumns} items={items}>
					{#each items as {title, description, url, imageUrl, faviconUrl, createdAt, saveGroups, id, type, gradientIndex}}
						<Item {title} {description} {url} {imageUrl} {faviconUrl} {createdAt} {saveGroups} {id} {type} {gradientIndex} />
					{/each}
				</Masonry>
			</div>
			{:else}
				<div class="grid grid-cols-{$listColumns} gap-6" use:gridArrowKeys={{ selector: '[data-grid-item]' }}>
					{#each items as {title, description, url, imageUrl, faviconUrl, createdAt, saveGroups, id, type, gradientIndex}}
						<Item {title} {description} {url} {imageUrl} {faviconUrl} {createdAt} {saveGroups} {id} {type} {gradientIndex} />
					{/each}
				</div>
			{/if}
		</div>
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

<AlertDialog.Root bind:open={$editStashDialogOpen} onOpenChange={editDialogChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Edit stash</AlertDialog.Title>
		</AlertDialog.Header>
		<EditForm data={$page.state.editStash}>
			<AlertDialog.Footer class="pt-2">
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action type="submit" form="edit-stash-form">Update</AlertDialog.Action>
			</AlertDialog.Footer>
		</EditForm>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={$deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Sure?</AlertDialog.Title>
			<AlertDialog.Description>The stash "{$itemToDelete?.title}" will be deleted and can't be restored afterwards.</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<form action={siteConfig.appUrl + '/save/delete'} method="post" use:enhance={handleDelete} id="delete-stash-form">
				<input type="hidden" name="id" value={$itemToDelete?.id}>
				<AlertDialog.Action class={buttonVariants({ variant: 'destructive' })} type="submit" form="delete-stash-form">Delete</AlertDialog.Action>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>