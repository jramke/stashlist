<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';

	import { siteConfig } from '$lib/config/site';
	import Link from '$lib/components/nav/Link.svelte';
	import { Separator } from '@repo/ui/components/separator';
	import { buttonVariants, Button } from '@repo/ui/components/button';
	import * as Dialog from '@repo/ui/components/dialog';
	import { enhance, applyAction } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { Skeleton } from '@repo/ui/components/skeleton';
	import { Plus, FolderPlus, Folder, Check, Inbox, Pencil, Trash, X, Logo, Stash } from '@repo/ui/icons';
	import { page } from '$app/stores';
	import { cn } from '@repo/ui/utils';
	import { Input } from '@repo/ui/components/input';
	import * as AlertDialog from "@repo/ui/components/alert-dialog";
	import { onMount } from 'svelte';
	import { toast } from '@repo/ui/components/sonner';
	import Userinfo from '$lib/components/nav/Userinfo.svelte';
	import type { TODO } from '$lib/types';
	import { Label } from '@repo/ui/components/label';

	let newGroupForm: HTMLFormElement | null;
	let newGroupInput: HTMLInputElement | null;
	let editGroupForm: HTMLFormElement | null;
	$: newGroupError = '';
	$: showNewGroupForm = false;
	$: editGroups = false;
	$: editGroupsErrors = [];
	$: newStashFormError = '';
	let newStashFormDialogOpen = false;
	// let newGroupError = $state('');
	// let showNewGroupForm = $state(false);

	let savesData: TODO;
	$: $page.data.saves.then(data => savesData = data);

	onMount(async () => {
		newGroupInput = document.querySelector('#new-group-input');
		newGroupForm = document.querySelector('#new-group-form');
		newGroupForm?.addEventListener('focusout', (e: any) => {
			if (newGroupForm?.contains(e.relatedTarget)) return;
			showNewGroupForm = false;
			newGroupError = '';
			newGroupInput && (newGroupInput.value = '');
		});
	});

	const enhanceNewGroupForm: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success') {
				invalidateAll();
				await applyAction(result);
				newGroupInput && (newGroupInput.value = '');
				showNewGroupForm = false;
				toast.success('Successfully created group');
			} else {
				newGroupError = 'Invalid group name';
				newGroupInput?.focus();
			}
		};
	};
	const enhanceEditGroupForm: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success') {
				invalidateAll();
				await applyAction(result);
				editGroups = false;
				editGroupsErrors = [];
				toast.success('Successfully updated groups');
			} else {
				editGroupsErrors = result.data.form.errors; // ??: why Property 'data' does not exist on type???
			}
		};
	};
	const enhanceDeleteGroupForm: SubmitFunction = () => {
		return async ({ result }) => {		
			if (result.type === 'success' || result.type === 'redirect') {
				invalidateAll();
				await applyAction(result);
				editGroups = false;
				editGroupsErrors = [];
				if (result.type === 'redirect') {
					goto(result.location);
				}
				toast.success('Successfully deleted group');
				return
			} 
			toast.error('Something went wrong deleting the group');
		};
	};
	const enhanceNewStashForm: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success') {
				invalidateAll();
				await applyAction(result);
				newStashFormError = '';
				newStashFormDialogOpen = false;
				toast.success('Successfully stashed new website');
			} else {
				newStashFormError = 'Something went wrong stashing the website';
			}
		};
	};

	function handleShowGroupForm() {
		showNewGroupForm = true;
		if (!newGroupInput) return;
		setTimeout(() => newGroupInput?.focus(), 0); // timeout needed to work
	}
</script>

<aside class="sticky top-0 h-screen flex-[350px] bg-card">
	<div class="flex flex-col items-start h-full overflow-hidden py-5">
		<div class="px-5 flex w-full items-center justify-between gap-3 pb-5">
			<div class="flex items-center px-3">
				<Logo class="me-3 h-5 w-5 text-primary" />
				<p class="text-xl font-bold">
					{siteConfig.name}
				</p>
			</div>
			<div>
				<Dialog.Root bind:open={newStashFormDialogOpen}>
					<Dialog.Trigger class={buttonVariants({ variant: 'ghost' })}>
						<span class="sr-only">New stash</span>
						<Plus class="h-4 w-4" />
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Stash a new website</Dialog.Title>
						</Dialog.Header>
						<form
							method="POST"
							action={siteConfig.appUrl + '/save/new'}
							class="space-y-2"
							use:enhance={enhanceNewStashForm}
						>	
							<Label for="url">Url</Label>
							<Input type="text" name="url" />
							{#if newStashFormError}
								<p class="text-sm text-destructive" aria-live="assertive">{newStashFormError}</p>
							{/if}
							<Dialog.Footer>
								<Button type="submit" class="mt-3">Add</Button>
							</Dialog.Footer>
						</form>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</div>
		<!-- <Separator /> -->
		<div class="px-5 flex w-full flex-col items-start">
			<Link path={siteConfig.appUrl}>
				<div class="flex items-center">
					<Stash class="me-2 h-4 w-4" />
					All stashes
				</div>
				{#if savesData?.items?.length}
					<div class="ms-auto">{savesData?.items?.length}</div>
				{/if}
			</Link>
			<Link path={siteConfig.appUrl + '/unsorted'}>
				<div class="flex items-center">
					<Inbox class="me-2 h-4 w-4" />
					Unsorted
				</div>
				{#if savesData?.noGroupCount}
					<div class="ms-auto">{savesData.noGroupCount}</div>
				{/if}
			</Link>
		</div>
		<div class="px-5 pb-1 pt-5 flex items-center justify-between gap-2 w-full">
			<p class="px-3 font-bold">My groups</p>
			{#await $page.data.groups}
				{''}
			{:then items}
				{#if items.length !== 0}
					{#if editGroups}
						<div>
							<Button variant="ghost" on:click={() => editGroups = false}>
								<X class="h-4 w-4" />
								<span class="sr-only">Cancel edit groups</span>
							</Button>
							<Button variant="ghost" on:click={() => editGroupForm?.requestSubmit()}>
								<Check class="h-4 w-4" />
								<span class="sr-only">Save groups</span>
							</Button>
						</div>
					{:else}
						<Button variant="ghost" on:click={() => editGroups = true}>
							<Pencil class="h-4 w-4" />
							<span class="sr-only">Edit groups</span>
						</Button>
					{/if}
				{/if}
			{/await}
		</div>
		<div class="w-full scroll-area px-5">
			<div class="flex w-full flex-col items-start">
				{#await $page.data.groups}
					<!-- {#each new Array(5) as _}
						<Skeleton class="mx-4 my-2 h-4 w-1/2" />
					{/each} -->
				{:then items}
					{#if items?.length > 0}
						{#if editGroups}
							<form method="POST" bind:this={editGroupForm} class="w-full" action={siteConfig.appUrl + '/group/edit'} use:enhance={enhanceEditGroupForm}>
								{#each items as { title, id }}
									<div class="flex items-center ps-4 py-1">
										<Folder class="me-2 h-4 w-4 shrink-0 animate-wiggle" />
										<Input
											type="text"
											name={id}
											class="rounded-none px-0 border-t-0 border-x-0 focus-visible:ring-0 focus-visible:ring-offset-0"
											value={title}
										/>
										<AlertDialog.Root>
											<AlertDialog.Trigger asChild let:builder>
												<Button builders={[builder]} variant="ghost" class="ms-2 h-auto p-2">
													<Trash class="h-4 w-4" />
													<span class="sr-only">Delete group {title}</span>
												</Button>
											</AlertDialog.Trigger>
											<AlertDialog.Content>
												<AlertDialog.Header>
													<AlertDialog.Title>Do you really want to delete the group?</AlertDialog.Title>
													<AlertDialog.Description>The group "{title}" will be deleted and removed from all related stashes.</AlertDialog.Description>
												</AlertDialog.Header>
												<AlertDialog.Footer>
													<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
													<form method="POST" action={siteConfig.appUrl + '/group/delete'} use:enhance={enhanceDeleteGroupForm}>
														<input type="hidden" name="id" value={id}>
														<input type="hidden" name="isOnCurrentSlug" value={$page.params.slug ? true : false}>
														<button type="submit">
															<AlertDialog.Action>Delete group</AlertDialog.Action>
														</button>
													</form>
												</AlertDialog.Footer>
												</AlertDialog.Content>
										</AlertDialog.Root>
									</div>
									{#if editGroupsErrors[id]}
										<p class="ps-8 text-sm text-destructive" aria-live="assertive">{editGroupsErrors[id][0]}</p>
									{/if}
								{/each}
							</form>
						{:else}
							{#each items as { title, id }}
								<Link path={siteConfig.appUrl + '/group/' + id}>
									<div class="flex items-center">
										<Folder class="me-2 h-4 w-4" />
										{title}
									</div>
									{#if savesData?.groupCounts[id]}
										<div class="ms-auto">{savesData?.groupCounts[id]}</div>
									<!-- {:else}
										<div class="ms-auto"></div> -->
									{/if}
								</Link>
							{/each}
						{/if}
					{/if}
				{:catch error}
					<p>Couldnt fetch groups!</p>
				{/await}
				<form
					method="POST"
					action={siteConfig.appUrl + '/group/new'}
					id="new-group-form"
					class={cn('w-full', showNewGroupForm ? 'block' : 'hidden')}
					use:enhance={enhanceNewGroupForm}
				>
					<div class="flex items-center ps-4 py-1">
						<Folder class="me-2 h-4 w-4 shrink-0" />
						<Input
							id="new-group-input"
							type="text"
							name="title"
							class="rounded-none px-0 border-t-0 border-x-0 focus-visible:ring-0 focus-visible:ring-offset-0"
						/>
						<Button type="submit" variant="ghost" class="ms-2 h-auto p-2">
							<Check class="h-4 w-4" />
							<span class="sr-only">Create</span>
						</Button>
					</div>
					{#if newGroupError}
						<p class="ps-8 text-sm text-destructive" aria-live="assertive">{newGroupError}</p>
					{/if}
				</form>
			</div>
		</div>
		<div class="w-full pt-2 px-5">
			<Separator />
			<Button
				variant="nav"
				on:click={handleShowGroupForm}
				class="w-full justify-start "
			>
				<FolderPlus class="me-2 h-4 w-4" />New group
			</Button>
		</div>
		<div class="w-full mt-auto px-8">
			<Separator />
			<div class="pt-3 relative">
				<Userinfo />
			</div>
			<!-- <div class="pt-5 border-t">
			</div> -->
		</div>
	</div>
</aside>
