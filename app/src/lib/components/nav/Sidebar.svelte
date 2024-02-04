<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';

	import { siteConfig } from '$lib/config/site';
	import Link from '$lib/components/nav/Link.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { buttonVariants } from '$lib/components/ui/button';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { enhance, applyAction} from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Plus, FolderPlus, Folder, Check, Bookmark, Compass } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import { Input } from '$lib/components/ui/input';
	import { onMount } from 'svelte';
	
	let newGroupForm: HTMLFormElement | null;
	let newGroupInput: HTMLInputElement | null;
	let newGroupError = $state('');
	let showNewGroupForm = $state(false);

	onMount(() => {
		newGroupInput = document.querySelector('#new-group-input');
		newGroupForm = document.querySelector('#new-group-form');
		newGroupForm?.addEventListener('focusout', (e: any) => {
			if (newGroupForm?.contains(e.relatedTarget)) return;
			showNewGroupForm = false
			newGroupError = '';
			newGroupInput && (newGroupInput.value = '');
		})
	})

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
	}

	function handleShowGroupForm() {
		showNewGroupForm = true;
		if (!newGroupInput) return;
		setTimeout(() => newGroupInput?.focus(), 0); // timeout needed to work
	}

</script>

<aside class="sticky top-0 p-5 flex-[350px] h-screen border-r bg-card">
	<div class="flex flex-col items-start">
		<div class="w-full flex gap-3 items-center justify-between">
			<p class="text-xl font-bold px-3">{siteConfig.name}</p>
			<div>
				<Dialog.Root>
					<Dialog.Trigger class={buttonVariants({ variant: "ghost" })}>
						<span class="sr-only">New stash</span>
						<Plus class="w-4 h-4" />
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>New stash</Dialog.Title>
							<Dialog.Description>New stash description</Dialog.Description>
						</Dialog.Header>
						<form method="POST" action={siteConfig.appUrl + '/save/new'} use:enhance={({ formElement, formData, action, cancel }) => {
							//TODO: improve ui
							return async ({ result }) => {
								console.log(result);
								await applyAction(result);
								invalidateAll();
							};
						}}>
							<input type="text" name="url" value="https://www.awwwards.com/">
							<Button type="submit">Save</Button>
						</form>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</div>
		<Separator />
		<div class="flex flex-col w-full items-start">
			<Link path={siteConfig.appUrl}><Bookmark class="h-4 w-4 me-2" />All stashes</Link>
			<Link path={siteConfig.appUrl + '/explore'}><Compass class="h-4 w-4 me-2" />Explore</Link>
		</div>
		<div class="pt-5 w-full">
			<p class="font-bold p-3">My groups</p>
			<div class="flex flex-col w-full items-start">
				{#await $page.data.groups}
					{#each new Array(5) as _}
						<Skeleton class="h-4 mx-4 my-2 w-1/2" />
					{/each}
				{:then items}
					{#if items?.length > 0}
						{#each items as { title, slug }}
							<Link path={siteConfig.appUrl + '/group/' + slug}>
								<Folder class="h-4 w-4 me-2" />{title}
							</Link>
						{/each}
					{/if}
				{:catch error}
					<p>Couldnt fetch groups!</p>
				{/await}
				<form method="POST" action={siteConfig.appUrl + '/group/new'} id="new-group-form" class={cn('w-full', showNewGroupForm ? 'block' : 'hidden')} use:enhance={enhanceNewGroupForm}>
						<div class="flex items-center px-4 py-1">
							<Folder class="h-4 w-4 me-2 shrink-0" />
							<Input id="new-group-input" type="text" name="title" class="px-0 border-0 border-b-input rounded-none focus-visible:ring-0 focus-visible:border-b-2" />
							<Button type="submit" variant="ghost" class="ms-2 p-2 h-auto">
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
		<div class="pt-5 w-full">
			<Button variant="outline" class="w-full" on:click={handleShowGroupForm}>
				<FolderPlus class="h-4 w-4 me-2" />New group
			</Button>
		</div>
	</div>
</aside>
