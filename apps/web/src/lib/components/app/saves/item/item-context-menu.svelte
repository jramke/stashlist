<script lang="ts">
	import type { SelectSave } from '$lib/server/db/schema';
	
	import * as ContextMenu from '@repo/ui/components/context-menu';
	import { Shortcut } from '@repo/ui/components/shortcut';
    import { Trash, Pencil, Copy, RotateCcw, Loader } from '@repo/ui/icons';
	import { itemsStore } from '$lib/stores';

	export let save: SelectSave;

	let triggerNode: HTMLDivElement;

	const { openContextMenus, createContextMenuOpenState, copyToClipboard, openEditDialog, deleteItem, refetchMetadata, fetchingMetadataItems, getCopyText } = itemsStore; 
	const openState = createContextMenuOpenState(false);

	const handleContextMenuOpen = (open: boolean) => {
		if (open) {
			if ($openContextMenus.length > 0) {
				$openContextMenus.forEach(menu => {
					menu.set(false);
				});
			}
			openContextMenus.set([openState]);
		}
	};

	$: isFetching = $fetchingMetadataItems.has(save.id);

</script>

<ContextMenu.Root onOpenChange={handleContextMenuOpen} bind:open={$openState} disableFocusFirstItem={true}>
	<ContextMenu.Trigger bind:el={triggerNode} class="stash-item-context-trigger flex-grow">
		<slot />
	</ContextMenu.Trigger>
	<ContextMenu.Content>
		<ContextMenu.Item on:click={() => openEditDialog(save.id)}>
			<Pencil class="size-4 me-2" />
			View details
			<ContextMenu.Shortcut>
				<Shortcut keys={['command', 'enter']} />
			</ContextMenu.Shortcut>
		</ContextMenu.Item>
		<ContextMenu.Item on:click={() => copyToClipboard(save)}>
			<Copy class="size-4 me-2" />
			{getCopyText(save.type)}
			<ContextMenu.Shortcut>
				<Shortcut keys={['command', 'C']} />
			</ContextMenu.Shortcut>
		</ContextMenu.Item>
		{#if save.type === 'website'}
			{#if isFetching}
				<ContextMenu.Item disabled={true}>
					<Loader class="size-4 me-2 animate-spin" />
					Fetching...
					<ContextMenu.Shortcut>
						<Shortcut keys={['command', 'R']} />
					</ContextMenu.Shortcut>
				</ContextMenu.Item>
			{:else}
				<ContextMenu.Item on:click={() => refetchMetadata(save.id)}>
					<RotateCcw class="size-4 me-2" />
					Refetch metadata
					<ContextMenu.Shortcut>
						<Shortcut keys={['command', 'R']} />
					</ContextMenu.Shortcut>
				</ContextMenu.Item>
			{/if}
		{/if}
		<ContextMenu.Item on:click={() => deleteItem(save.id)} class="data-[highlighted]:bg-destructive/10 data-[highlighted]:shadow-destructive/10 data-[highlighted]:border-destructive/30">
			<Trash class="size-4 me-2" />
			Delete
			<ContextMenu.Shortcut>
				<Shortcut keys={['command', 'D']} />
			</ContextMenu.Shortcut>
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>

<style>
	:global(.stash-item-context-trigger a) {
		-webkit-touch-callout: none;
	}
</style>


