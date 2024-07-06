<script lang="ts">
	import type { Save } from '$lib/types';
	
	import * as ContextMenu from '@repo/ui/components/context-menu';
	import { Shortcut } from '@repo/ui/components/shortcut';
    import { Trash, Pencil, Copy, RotateCcw, Loader } from '@repo/ui/icons';
	import { itemsStore } from '$lib/stores';

    export let id: Save['id'];
	export let copyUrl: string;
	export let type: Save['type'];

	let triggerNode: HTMLDivElement;

	const { openContextMenus, createContextMenuOpenState, copyUrlToClipboard, openEditDialog, deleteItem, refetchMetadata, fetchingMetadataItems } = itemsStore; 
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

	$: isFetching = $fetchingMetadataItems.has(id);

</script>

<ContextMenu.Root onOpenChange={handleContextMenuOpen} bind:open={$openState} disableFocusFirstItem={true}>
	<ContextMenu.Trigger bind:el={triggerNode}>
		<slot />
	</ContextMenu.Trigger>
	<ContextMenu.Content>
		<ContextMenu.Item on:click={() => openEditDialog(id)}>
			<Pencil class="size-4 me-2" />
			View details
			<ContextMenu.Shortcut>
				<Shortcut keys={['command', 'enter']} />
			</ContextMenu.Shortcut>
		</ContextMenu.Item>
		<ContextMenu.Item on:click={() => copyUrlToClipboard(copyUrl)}>
			<Copy class="size-4 me-2" />
			Copy URL
			<ContextMenu.Shortcut>
				<Shortcut keys={['command', 'C']} />
			</ContextMenu.Shortcut>
		</ContextMenu.Item>
		{#if type === 'website'}
			{#if isFetching}
				<ContextMenu.Item disabled={true}>
					<Loader class="size-4 me-2 animate-spin" />
					Fetching...
					<ContextMenu.Shortcut>
						<Shortcut keys={['command', 'R']} />
					</ContextMenu.Shortcut>
				</ContextMenu.Item>
			{:else}
				<ContextMenu.Item on:click={() => refetchMetadata(id)}>
					<RotateCcw class="size-4 me-2" />
					Refetch metadata
					<ContextMenu.Shortcut>
						<Shortcut keys={['command', 'R']} />
					</ContextMenu.Shortcut>
				</ContextMenu.Item>
			{/if}
		{/if}
		<ContextMenu.Item on:click={() => deleteItem(id)} class="data-[highlighted]:bg-destructive/10 data-[highlighted]:shadow-destructive/10 data-[highlighted]:border-destructive/30">
			<Trash class="size-4 me-2" />
			Delete
			<ContextMenu.Shortcut>
				<Shortcut keys={['command', 'D']} />
			</ContextMenu.Shortcut>
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>




