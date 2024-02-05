<script lang="ts">
	import type { Save } from '$lib/types';
	import type { SubmitFunction } from '@sveltejs/kit';

	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { MoreHorizontal, Trash, Pencil, CircleDashed  } from 'lucide-svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Badge } from "$lib/components/ui/badge";
	import { cleanUrl } from '$lib/utils';
	import Waves from '$lib/placeholder/waves.svelte';
	import { siteConfig } from '$lib/config/site';
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as AlertDialog from "$lib/components/ui/alert-dialog";

	// TODO: use let { a,b } = $props();
	export let title: Save['title'];
	export let description: Save['description'];
	export let url: Save['url'];
	export let imageUrl: Save['imageUrl'];
	export let faviconUrl: Save['faviconUrl'];
	export let saveGroups: any[] = []; //TODO
	export let id: string;

	let deleteDialogOpen = false;

	const openDeleteDialog = () => deleteDialogOpen = true;

	const handleDelete: SubmitFunction = ({ formElement, formData, action, cancel }) => {
		return async ({ result }) => {
			if (result.type === 'success') {
				invalidateAll();
				toast.success('Successfuly deleted stash');
				await applyAction(result);
			} else {
				toast.error('Failed to delete the stash');
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
						<DropdownMenu.Item>
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