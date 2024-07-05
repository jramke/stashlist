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
	import { Loader } from '@repo/ui/icons';
	import { Shortcut } from "@repo/ui/components/shortcut";
	import * as Tooltip from '@repo/ui/components/tooltip';

	const { editDialogOpen, focusedItem, editDialogCloseCallback } = itemsStore;

	let busy = false;

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

<Section class="container py-10 flex flex-col h-[100vh]">
	<!-- <div class="container pt-10 pb-6"> -->
		<Topbar />
	<!-- </div> -->
	<Section class="py-10 flex-grow grid">
		<!-- <ScrollArea class="max-h-[650px] pb-5 data-[scrollbar-visible=true]>.container:-mr-1" indicatorMask={true}> -->
			<!-- <div class="container"> -->
				<slot />
			<!-- </div> -->
		<!-- </ScrollArea> -->
	</Section>
</Section>

{#if $page.state.editStash}
	<Drawer.Root bind:open={$editDialogOpen} shouldScaleBackground={false} onOpenChange={editDialogChange} direction="right">
		<Drawer.Content layoutDirection={'right'}>
			<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
			<div tabindex="0" class="outline-none flex flex-col flex-grow h-full">
				<Drawer.Header>
					<Drawer.Title>Detail view</Drawer.Title>
				</Drawer.Header>
				<ScrollArea class="h-full" indicatorMask={true}>
					<div class="p-4 flex flex-col flex-grow">
						<EditForm data={$page.state.editStash} bind:busy={busy}>
						</EditForm>
					</div>
				</ScrollArea>
				<Drawer.Footer class="pt-4 grid grid-cols-2">
					<Drawer.Close class={buttonVariants({variant: 'outline'})} disabled={busy}>Cancel</Drawer.Close>
					<Tooltip.Root openDelay={200}>
						<Tooltip.Trigger asChild let:builder>
							<Button builders={[builder]} type="submit" form="edit-stash-form" disabled={busy}>
								{#if busy}
									<Loader class="animate-spin size-4" />
									<span class="ml-2">Updating...</span>
								{:else}
									Update
								{/if}
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<span class="flex gap-1">
								Shortcut:
								<Shortcut keys={['command', 'S']} />
							</span>
						</Tooltip.Content>
					</Tooltip.Root>
				</Drawer.Footer>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
