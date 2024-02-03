<script lang="ts">
	import { siteConfig } from '$lib/config/site';
	import Link from '$lib/components/nav/Link.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { buttonVariants } from '$lib/components/ui/button';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { enhance, applyAction} from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Plus, FolderPlus, Folder } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';

</script>

<aside
	class="p-5 flex-[350px] border-r bg-card"
>
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
						<form method="POST" action="/api/saves/new" use:enhance={({ formElement, formData, action, cancel }) => {				
							return async ({ result }) => {
								console.log(result);
								invalidateAll();
								await applyAction(result);
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
			<Link path={siteConfig.appUrl}>All stashes</Link>
			<Link path={siteConfig.appUrl + '/snippets'}>Snippets</Link>
		</div>
		<div class="pt-5 w-full">
			<p class="font-bold p-3">My groups</p>
			<div class="flex flex-col w-full items-start">
				{#await $page.data.groups}
					{#each new Array(5) as _}
						<Skeleton class="h-4 my-2 w-1/2" />
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
			</div>
		</div>
		<div class="pt-5 w-full">
			<Dialog.Root>
				<Dialog.Trigger class={cn(buttonVariants({ variant: "outline" }), 'w-full')}>
					<FolderPlus class="h-4 w-4 me-2" />New group
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>New group</Dialog.Title>
						<Dialog.Description>New group description</Dialog.Description>
					</Dialog.Header>
					<form method="POST" action="/api/groups/new" use:enhance={({ formElement, formData, action, cancel }) => {				
						return async ({ result }) => {
							console.log(result);
							invalidateAll();
							await applyAction(result);
						};
					}}>
						<input type="text" name="title" />
						<Button type="submit">Save</Button>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	</div>
</aside>
