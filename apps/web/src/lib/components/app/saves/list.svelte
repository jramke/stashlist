<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { siteConfig } from '$lib/config/site';
	import { listLayout, listColumns, itemsStore } from '$lib/stores';
	import { EmptyState } from '$lib/components/app';
    import { Item } from '$lib/components/app/saves';
	import Masonry from '@repo/ui/components/masonry';
	import { Button, buttonVariants } from '@repo/ui/components/button';
	import * as Drawer from '@repo/ui/components/drawer';
	import EditForm from '$routes/main/save/edit/[id]/+page.svelte';
	import { gridArrowKeys } from '$lib/actions';
	import { toast } from '@repo/ui/components/sonner';
	import { ScrollArea } from '@repo/ui/components/scroll-area';

    type SaveListOptions = 'all' | 'savesByGroup' | 'unsorted';
    export let saves: SaveListOptions = 'all';

	const { editDialogOpen, focusedItem, editDialogCloseCallback } = itemsStore;

    $: saveOption = {
        'all': getAll(),
        'savesByGroup': $page.data.savesByGroup,
        'unsorted': getUnsorted(),
    }

	let hasStashes: boolean;
	$: (async() => hasStashes = (await getAll()).length > 0)();

	function getAll() {
		const items = $page.data.saves?.items || [];
		if (!items || items.length === 0) return [];
		return items;
	}

	function getUnsorted() {
		const items = $page.data.saves?.items || [];
		if (!items || items.length === 0) return [];
		return items.filter(save => save.saveGroups.length === 0);
	}

	async function editDialogChange(open: boolean) {
		if (!open) {
			if ($page.state.editStash) {
				await invalidateAll(); // if this is not there error: "pushstate Could not serialize state.form"
				history.back();
			}
			if ($focusedItem) {
				$focusedItem?.focus();
				focusedItem.set(null);
			}
			$editDialogCloseCallback?.();
			editDialogCloseCallback.set(null);
		}
	}

</script>

<div class="hidden grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5"></div>

{#if saveOption[saves]?.length > 0}
	<div class="self-start">
		{#if $listLayout === 'masonry'}
			<div use:gridArrowKeys={{ selector: '[data-grid-item]' }}>
				<Masonry gapSize={6} columns={$listColumns} items={saveOption[saves]}>
					{#each saveOption[saves] as {title, url, imageUrl, faviconUrl, createdAt, saveGroups, id, type, gradientIndex}}
						<Item {title} {url} {imageUrl} {faviconUrl} {createdAt} {saveGroups} {id} {type} {gradientIndex} />
					{/each}
				</Masonry>
			</div>
		{:else}
			<div class="grid grid-cols-{$listColumns} gap-6" use:gridArrowKeys={{ selector: '[data-grid-item]' }}>
				{#each saveOption[saves] as {title, url, imageUrl, faviconUrl, createdAt, saveGroups, id, type, gradientIndex}}
					<Item {title} {url} {imageUrl} {faviconUrl} {createdAt} {saveGroups} {id} {type} {gradientIndex} />
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

{#if $page.state.editStash}
	<Drawer.Root bind:open={$editDialogOpen} onOpenChange={editDialogChange} direction="right">
		<Drawer.Content layoutDirection={'right'}>
			<ScrollArea class="h-full">
				<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
				<div tabindex="0" class="outline-none flex flex-col flex-grow h-full">
					<Drawer.Header>
						<Drawer.Title>Detail view</Drawer.Title>
					</Drawer.Header>
					<div class="p-4 flex flex-col flex-grow">
						<EditForm data={$page.state.editStash}>
							<Drawer.Footer class="p-0 pt-4 grid grid-cols-2">
								<Drawer.Close class={buttonVariants({variant: 'outline'})}>Cancel</Drawer.Close>
								<Button type="submit" form="edit-stash-form">Update</Button>
							</Drawer.Footer>
						</EditForm>
					</div>
				</div>
			</ScrollArea>
		</Drawer.Content>
	</Drawer.Root>
{/if}