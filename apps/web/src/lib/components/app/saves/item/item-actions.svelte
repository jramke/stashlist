<script lang="ts">
    import type { SubmitFunction } from '@sveltejs/kit';

    import * as DropdownMenu from '@repo/ui/components/dropdown-menu';
	import { buttonVariants } from '@repo/ui/components/button';
    import { toast } from '@repo/ui/components/sonner';
    import { MoreHorizontal, Trash, Pencil, Copy } from '@repo/ui/icons';
    import * as AlertDialog from "@repo/ui/components/alert-dialog";
    import { siteConfig } from '$lib/config/site';
    import { applyAction, enhance } from '$app/forms';
    import { goto, invalidateAll, preloadData, pushState } from '$app/navigation';
	
	import type { Save } from '$lib/types';
	import { cn } from '@repo/ui/utils';
	import { editStashDialogOpen } from '$lib/stores';

    export let id: Save['id'];
    export let title: Save['title'];
	export let copyUrl: string;

    let deleteDialogOpen = false;

	const openDeleteDialog = () => deleteDialogOpen = true;

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

	const openEditDialog = async () => {
		const href = siteConfig.appUrl + '/save/edit/' + id;
		const result = await preloadData(href);

		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { editStash: {
				form: result.data.form,
				save: result.data.save,
				groups: result.data.groups,
				isDialog: true,
			} })
			setTimeout(() => {
				editStashDialogOpen.set(true);
			}, 100);
			
		} else {
			goto(href)
		}
	};

	const handleCopyUrl = () => {
		navigator.clipboard.writeText(copyUrl);
		toast.success('URL copied to clipboard');
	};

</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8')}>
        <MoreHorizontal class="size-4" />
        <span class="sr-only">Open menu</span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
        <DropdownMenu.Group>
            <DropdownMenu.Item on:click={openEditDialog}>
                <Pencil class="size-4 me-2" />
                Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item on:click={handleCopyUrl}>
                <Copy class="size-4 me-2" />
                Copy URL
            </DropdownMenu.Item>
			<DropdownMenu.Separator />
            <DropdownMenu.Item on:click={openDeleteDialog} class="data-[highlighted]:bg-destructive/10 data-[highlighted]:shadow-destructive/10 data-[highlighted]:border-destructive/30">
                <Trash class="size-4 me-2" />
                Delte
            </DropdownMenu.Item>
        </DropdownMenu.Group>
    </DropdownMenu.Content>
</DropdownMenu.Root>


<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Sure?</AlertDialog.Title>
			<AlertDialog.Description>The stash "{title}" will be deleted and can't be restored afterwards.</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<form action={siteConfig.appUrl + '/save/delete'} method="post" use:enhance={handleDelete} id="delete-stash-form">
				<input type="hidden" name="id" value={id}>
				<AlertDialog.Action class={buttonVariants({ variant: 'destructive' })} type="submit" form="delete-stash-form">Delete</AlertDialog.Action>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

