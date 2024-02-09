<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';

	import { siteConfig } from '$lib/config/site';
	import Link from '$lib/components/nav/Link.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { buttonVariants } from '$lib/components/ui/button';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { enhance, applyAction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Plus, FolderPlus, Folder, Check, Bookmark, Compass, LogOut, Pencil } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import { Input } from '$lib/components/ui/input';
	import { onMount } from 'svelte';

	let newGroupForm: HTMLFormElement | null;
	let newGroupInput: HTMLInputElement | null;
	$: newGroupError = '';
	$: showNewGroupForm = false;
	$: editGroups = false;
	// let newGroupError = $state('');
	// let showNewGroupForm = $state(false);

	onMount(() => {
		newGroupInput = document.querySelector('#new-group-input');
		newGroupForm = document.querySelector('#new-group-form');
		newGroupForm?.addEventListener('focusout', (e: any) => {
			if (newGroupForm?.contains(e.relatedTarget)) return;
			showNewGroupForm = false;
			newGroupError = '';
			newGroupInput && (newGroupInput.value = '');
		});
	});

	const enhanceNewGroupForm: SubmitFunction = ({ formElement, formData, action, cancel }) => {
		return async ({ result }) => {
			if (result.type === 'success') {
				invalidateAll();
				await applyAction(result);
				newGroupInput && (newGroupInput.value = '');
				showNewGroupForm = false;
			} else {
				newGroupError = 'Invalid group name';
				newGroupInput?.focus();
			}
		};
	};

	function handleShowGroupForm() {
		showNewGroupForm = true;
		if (!newGroupInput) return;
		setTimeout(() => newGroupInput?.focus(), 0); // timeout needed to work
	}
</script>

<aside class="sticky top-0 h-screen flex-[350px] border-r bg-card">
	<div class="flex flex-col items-start h-full overflow-hidden p-5">
		<div class="flex w-full items-center justify-between gap-3">
			<p class="px-3 text-xl font-bold">{siteConfig.name}</p>
			<div>
				<Dialog.Root>
					<Dialog.Trigger class={buttonVariants({ variant: 'ghost' })}>
						<span class="sr-only">New stash</span>
						<Plus class="h-4 w-4" />
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>New stash</Dialog.Title>
							<Dialog.Description>New stash description</Dialog.Description>
						</Dialog.Header>
						<form
							method="POST"
							action={siteConfig.appUrl + '/save/new'}
							use:enhance={({ formElement, formData, action, cancel }) => {
								//TODO: improve ui
								return async ({ result }) => {
									console.log(result);
									await applyAction(result);
									invalidateAll();
								};
							}}
						>
							<input type="text" name="url" value="https://www.awwwards.com/" />
							<Button type="submit">Save</Button>
						</form>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</div>
		<Separator />
		<div class="flex w-full flex-col items-start">
			<Link path={siteConfig.appUrl}><Bookmark class="me-2 h-4 w-4" />All stashes</Link>
			<Link path={siteConfig.appUrl + '/explore'}><Compass class="me-2 h-4 w-4" />Explore</Link>
		</div>
		<div class="pb-1 pt-5 flex items-center justify-between gap-2 w-full">
			<p class="px-3 font-bold">My groups</p>
			{#if editGroups}
				<Button variant="ghost" on:click={() => editGroups = false}>
					<Check class="h-4 w-4" />
				</Button>
			{:else}
				<Button variant="ghost" on:click={() => editGroups = true}>
					<Pencil class="h-4 w-4" />
				</Button>
			{/if}
		</div>
		<div class="w-full overflow-auto">
			<div class="flex w-full flex-col items-start">
				{#await $page.data.groups}
					{#each new Array(5) as _}
						<Skeleton class="mx-4 my-2 h-4 w-1/2" />
					{/each}
				{:then items}
					{#if items?.length > 0}
						{#if editGroups}
							<form method="POST" class="w-full" action={siteConfig + '/group/edit'} use:enhance>
								{#each items as { title, id }}
									<div class="flex items-center px-4 py-1">
										<Folder class="me-2 h-4 w-4 shrink-0 animate-wiggle" />
										<Input
											type="text"
											name="id"
											class="rounded-none border-0 border-b-input px-0 border-b-2 focus-visible:ring-0"
											value={title}
										/>
									</div>
								{/each}
							</form>
						{:else}
							{#each items as { title, id }}
								<Link path={siteConfig.appUrl + '/group/' + id}>
									<Folder class="me-2 h-4 w-4" />{title}
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
					<div class="flex items-center px-4 py-1">
						<Folder class="me-2 h-4 w-4 shrink-0" />
						<Input
							id="new-group-input"
							type="text"
							name="title"
							class="rounded-none border-0 border-b-input px-0 focus-visible:border-b-2 focus-visible:ring-0"
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
		<div class="w-full pt-5">
			<Button variant="outline" class="w-full" on:click={handleShowGroupForm}>
				<FolderPlus class="me-2 h-4 w-4" />New group
			</Button>
		</div>
		<div class="w-full pt-5 mt-auto">
			<form method="post" class="w-full" action="/logout" use:enhance>
				<Button type="submit" variant="nav">
					<LogOut class="w-4 h-4 me-1" />
					Logout
				</Button>
			</form>
		</div>
	</div>
</aside>
