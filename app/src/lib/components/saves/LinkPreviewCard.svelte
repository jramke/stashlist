<script lang="ts">
	import type { Save, TODO } from '$lib/types';
	import type { SubmitFunction } from '@sveltejs/kit';

	import { applyAction, enhance } from '$app/forms';
	import { goto, invalidateAll, preloadData, pushState } from '$app/navigation';
	import { MoreHorizontal, Trash, Pencil, CircleDashed  } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { cleanUrl } from '$lib/utils';
	import { siteConfig } from '$lib/config/site';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Badge } from "$lib/components/ui/badge";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import Waves from '$lib/placeholder/waves.svelte';
	import EditForm from '../../../routes/app/save/edit/[id]/+page.svelte';
	import { page } from '$app/stores';

	// TODO: use let { a,b } = $props();
	export let title: Save['title'];
	export let description: Save['description'];
	export let url: Save['url'];
	export let imageUrl: Save['imageUrl'];
	export let faviconUrl: Save['faviconUrl'];
	export let createdAt: Save['createdAt'];
	export let userId: string = '';
	export let saveGroups: TODO[] = [];
	export let id: string;

	// export let editForm: SuperValidated<FormSchema>;

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
				invalidateAll();
				toast.success('Successfully deleted stash');
				await applyAction(result);
			} else {
				toast.error('Failed to delete stash');
			}
		};
	};
	const handlEdit: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success') {
				invalidateAll();
				toast.success('Successfully updated stash');
				await applyAction(result);
			} else {
				toast.error('Failed to update stash');
			}
		};
	};

</script>

<div class="overflow-hidden rounded-lg border bg-card text-card-foreground">
	<a
		href={url}
		{title}
		rel="norefferrer noopener"
		target="_blank"
		class="relative flex aspect-og overflow-hidden border-b"
	>
		<!-- TODO: cool css or svg placeholder -->
		<Waves class="absolute inset-0 h-full w-full" />
		{#if imageUrl}	
			<img
				loading="lazy"
				src={imageUrl}
				alt={title}
				class="absolute inset-0 h-full w-full object-cover"
			/>
		{/if}
	</a>
	<div class="flex gap-4 p-4">
		<div class="flex flex-col gap-2">
			<span class="line-clamp-2 text-lg font-bold">{title}</span>
			{#if description}
				<span class="mb-2 line-clamp-2 text-sm">{description}</span>
			{/if}
			<div class="flex items-center gap-2">
				{#if faviconUrl}
					<img loading="lazy" class="h-4 w-4" src={faviconUrl} alt={title} />
				{:else}
					<CircleDashed class="h-4 w-4 text-muted-foreground" />
				{/if}
				<a
					href={url}
					{title}
					rel="norefferrer noopener"
					target="_blank"
					class="line-clamp-1 text-sm text-muted-foreground"
				>
					{cleanUrl(url)}
				</a>
			</div>
			{#if saveGroups.length !== 0}
				<div class="flex flex-wrap gap-1 pt-2">
					{#each saveGroups as group}
						<Badge variant="outline">
							{group.group.title}
						</Badge>
					{/each}
				</div>
			{/if}
		</div>
		<div class="ml-auto flex">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class={buttonVariants({ variant: 'ghost' })}>
					<MoreHorizontal class="h-4 w-4" />
					<span class="sr-only">Open menu</span>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Group>
						<DropdownMenu.Item on:click={openEditDialog} on:keydown={openEditDialog}>
							<Pencil class="h-4 w-4 me-1" />
							Edit
						</DropdownMenu.Item>
						<DropdownMenu.Item on:click={openDeleteDialog} on:keydown={openDeleteDialog}>
							<Trash class="h-4 w-4 me-1" />
							Delte
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
</div>

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
	{#if $page.state.selected}
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Edit stash</AlertDialog.Title>
			</AlertDialog.Header>
			<EditForm data={$page.state.selected}>
				<AlertDialog.Footer class="pt-2">
					<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
					<button type="submit">
						<AlertDialog.Action>Update stash</AlertDialog.Action>
					</button>
				</AlertDialog.Footer>
			</EditForm>
		</AlertDialog.Content>
	{/if}	
</AlertDialog.Root>