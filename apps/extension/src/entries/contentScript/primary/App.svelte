<script lang="ts">
	import '@repo/ui/globals.pcss';
	import '../../../app.pcss';

	import browser from 'webextension-polyfill';
	import * as Dialog from '@repo/ui/components/dialog';
	import { Input } from '@repo/ui/components/input';
	import { Label } from '@repo/ui/components/label';
	import { Button } from '@repo/ui/components/button';
	import { onMount } from 'svelte';
	// import { Toaster } from '@ui/components/ui/sonner';
	// import { ModeWatcher } from 'mode-watcher';
	// import { toast } from 'svelte-sonner';
	import { z } from 'zod';

	type NewStashEdit = {
		[key: string]: {
			label: string;
			data: string;
			error: any;
		};
	};

	let editDialogOpen = false;
	let newStashData: NewStashEdit;
	let newStashForm: HTMLFormElement | null | undefined;
	let stashlistRoot: HTMLElement | null | undefined;

	onMount(() => {
		const stashlistContainer = document.getElementById('stashlist-container');
		const stashlistContainerRoot = stashlistContainer && stashlistContainer.shadowRoot;
		stashlistRoot = stashlistContainerRoot?.querySelector('#stashlist-root');
		stashlistRoot?.classList.add('dark');
	})

	browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
			if (message.editNewStash) {
				newStashData = message.editNewStash;
				console.log(newStashData);
				
				editDialogOpen = true;

				setTimeout(() => {
					newStashForm = stashlistRoot?.querySelector('#stashlist-form');
	
					if (!newStashForm) return;
	
					newStashForm.addEventListener('submit', async (e) => {
						e.preventDefault();
						const form = e.target as HTMLFormElement;
						const formData = Object.fromEntries(new FormData(form));
						
						// Generate a dynamic Zod schema based on the form data array
						const formSchema = z.object({
							title: z.string().min(1),
							description: z.string().default('').optional(),
							url: z.string().url(),
							groups: z.string().default('').optional()
						});
						try {
							formSchema.parse(formData);
						} catch (err) {
							if (err instanceof z.ZodError) {
								console.log(err.issues);
								err.issues.forEach(issue => {
									newStashData[issue.path[0]].error = issue;
								})
							}
							return
						}

						browser.runtime.sendMessage({
							newStash: formData
						})
					})
				}, 100);
			}

			if (message.newStashAdded) {
				editDialogOpen = false;
				// console.log(toast);
				// toast.success('Successfully created stash');
			}
		}
	);

</script>

<div>

	<!-- both not working -->
	<!-- <Toaster position="bottom-center" />
	<ModeWatcher /> -->

	<Dialog.Root bind:open={editDialogOpen} portal={stashlistRoot} preventScroll={false}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Save new stash</Dialog.Title>
			</Dialog.Header>
			<form id="stashlist-form" class="space-y-2">
				{#each Object.entries(newStashData) as [key, value]}
					{#if key === 'imageUrl' || key === 'faviconUrl'}
						<Input type="hidden" name={key} value={value.data} />
					{:else}
						<div class="space-y-2">
							<Label for={key}>{value.label}</Label>
							<Input name={key} value={value.data} />
							{#if value.error}
								<p class="text-destructive text-sm">{value.error.message}</p>
							{/if}
						</div>
					{/if}
				{/each}
				<Dialog.Footer class="pt-2">
					<Button type="submit">Save stash</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

</div>
