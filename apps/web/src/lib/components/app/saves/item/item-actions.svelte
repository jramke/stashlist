<script lang="ts">
    import type { SubmitFunction } from '@sveltejs/kit';

    import * as DropdownMenu from '@repo/ui/components/dropdown-menu';
	import { buttonVariants } from '@repo/ui/components/button';
    import { toast } from '@repo/ui/components/sonner';
    import { MoreHorizontal, Trash, Pencil } from '@repo/ui/icons';
    import * as AlertDialog from "@repo/ui/components/alert-dialog";
    import { siteConfig } from '$lib/config/site';
    import { applyAction, enhance } from '$app/forms';
    import { page } from '$app/stores';
    import { goto, invalidateAll, preloadData, pushState } from '$app/navigation';
	import EditForm from '../../../../../routes/main/save/edit/[id]/+page.svelte';
	import type { Save } from '$lib/types';

    export let id: Save['id'];
    export let title: Save['title'];

    let deleteDialogOpen = false;
	let editDialogOpen = $page.state.selected?.form ? true : false;

	const openDeleteDialog = () => deleteDialogOpen = true;
	// const openEditDialog = () => editDialogOpen = true;
	const openEditDialog = async () => {
		const href = siteConfig.appUrl + '/save/edit/' + id;
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { selected: {
				form: result.data.form,
				save: result.data.save,
				groups: result.data.groups
			} })
			editDialogOpen = true;
		} else {
			goto(href)
		}
	};
	const editDialogChange = (open: boolean) => {
		if (!open) {
			history.back();
			invalidateAll(); // if this is not there error: "pushstate Could not serialize state.form"
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
		};
	};

</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger class={buttonVariants({ variant: 'ghost' })}>
        <MoreHorizontal class="h-4 w-4" />
        <span class="sr-only">Open menu</span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
        <DropdownMenu.Group>
            <DropdownMenu.Item on:click={openEditDialog}>
                <Pencil class="h-4 w-4 me-1" />
                Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item on:click={openDeleteDialog}>
                <Trash class="h-4 w-4 me-1" />
                Delte
            </DropdownMenu.Item>
        </DropdownMenu.Group>
    </DropdownMenu.Content>
</DropdownMenu.Root>


<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Do you really want to delete the stash?</AlertDialog.Title>
			<AlertDialog.Description>The stash "{title}" will be deleted.</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<form action={siteConfig.appUrl + '/save/delete'} method="post" use:enhance={handleDelete}>
				<input type="hidden" name="id" value={id}>
				<button type="submit">
					<AlertDialog.Action>Delete stash</AlertDialog.Action>
				</button>
			</form>
		</AlertDialog.Footer>
		</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={editDialogOpen} onOpenChange={editDialogChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Edit stash</AlertDialog.Title>
		</AlertDialog.Header>
		<!-- {#if $page.state.selected} -->
			<EditForm data={$page.state.selected}>
				<AlertDialog.Footer class="pt-2">
					<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
					<button type="submit">
						<AlertDialog.Action>Update stash</AlertDialog.Action>
					</button>
				</AlertDialog.Footer>
			</EditForm>
		<!-- {/if}	 -->
	</AlertDialog.Content>
</AlertDialog.Root>