<script lang="ts">
	import type { Save } from '$lib/types';
	
	import * as ContextMenu from '@repo/ui/components/context-menu';
	import { Shortcut } from '@repo/ui/components/shortcut';
    import { Trash, Pencil, Copy } from '@repo/ui/icons';
	import { getItemsContext } from './context';

    export let id: Save['id'];
    export let title: Save['title'];
	export let copyUrl: string;
	
	const { openContextMenus, createContextMenuOpenState, copyUrlToClipboard, openEditDialog, openDeleteDialog, deleteDialogOpen } = getItemsContext();
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

</script>

<ContextMenu.Root onOpenChange={handleContextMenuOpen} bind:open={$openState} disableFocusFirstItem={true}>
	<ContextMenu.Trigger>
		<slot />
	</ContextMenu.Trigger>
	<ContextMenu.Content>
		<!-- <ContextMenu.Label>Actions</ContextMenu.Label> -->
		<ContextMenu.Item on:click={() => openEditDialog(id)}>
			<Pencil class="size-4 me-2" />
			Edit
			<ContextMenu.Shortcut>
				<Shortcut keys={['command', 'E']} />
			</ContextMenu.Shortcut>
		</ContextMenu.Item>
		<ContextMenu.Item on:click={() => copyUrlToClipboard(copyUrl)}>
			<Copy class="size-4 me-2" />
			Copy URL
			<ContextMenu.Shortcut>
				<Shortcut keys={['command', 'C']} />
			</ContextMenu.Shortcut>
		</ContextMenu.Item>
		<ContextMenu.Item on:click={() => openDeleteDialog(id, title)} class="data-[highlighted]:bg-destructive/10 data-[highlighted]:shadow-destructive/10 data-[highlighted]:border-destructive/30">
			<Trash class="size-4 me-2" />
			Delete
			<ContextMenu.Shortcut>
				<Shortcut keys={['command', 'D']} />
			</ContextMenu.Shortcut>
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>



