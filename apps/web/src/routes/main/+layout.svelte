<script lang="ts">
	import Section from '@repo/ui/components/section';
	import { Topbar } from '$lib/components/app/nav';
	import { CommandMenu } from '$lib/components/app/command';
	import { page } from '$app/stores';
	import { itemsStore } from '$lib/stores';
	import { ScrollArea } from '@repo/ui/components/scroll-area';
	import { Button, buttonVariants } from '@repo/ui/components/button';
	import * as Drawer from '@repo/ui/components/drawer';
	import EditForm from '$routes/main/save/edit/[id]/+page.svelte';
	import { invalidateAll } from '$app/navigation';

	const { editDialogOpen, focusedItem, editDialogCloseCallback } = itemsStore;

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

<CommandMenu />

<Section class="py-10 container flex flex-col min-h-[100vh]">
	<!-- <div class="sticky w-full top-0 bg-background/80 backdrop-blur z-50"> -->
		<Topbar />
	<!-- </div> -->
	<Section class="py-10 flex-grow grid">
		<!-- <ScrollArea class="max-h-[755px] pb-5"> -->
			<slot />
		<!-- </ScrollArea> -->
	</Section>
</Section>

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
