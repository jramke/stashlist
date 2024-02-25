<script lang="ts">
	import '@repo/ui/globals.pcss';
	import '../../../app.pcss';

	import browser from 'webextension-polyfill';
	import * as Dialog from '@repo/ui/components/dialog';
	import { Input } from '@repo/ui/components/input';
	import { Label } from '@repo/ui/components/label';
	import { Button } from '@repo/ui/components/button';
	import Tags from "@repo/ui/components/tags";
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
			hidden: boolean;
		};
	};
	

	let editDialogOpen = false;
	let newStashFormData: NewStashEdit;
	let newStashType: string;
	let aviableGroups: any[] = [];
	let newStashForm: HTMLFormElement | null | undefined;
	let stashlistRoot: HTMLElement | null | undefined;
	let groups: any[] = [];

	$: groupIds = groups.map(item => item.id);

	onMount(() => {
		const stashlistContainer = document.getElementById('stashlist-container');
		const stashlistContainerRoot = stashlistContainer && stashlistContainer.shadowRoot;
		stashlistRoot = stashlistContainerRoot?.querySelector('#stashlist-root');
		stashlistRoot?.classList.add('dark');
	})

	browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
			if (message.editNewStash) {
				newStashFormData = message.editNewStash.form;
				console.log(newStashFormData);
				newStashType = message.editNewStash.type;
				aviableGroups = message.editNewStash.groups
				
				let formSchema: any;
				if (newStashType === 'website') {
					formSchema = z.object({
						title: z.string().min(1),
						description: z.string().default('').optional(),
						url: z.string().url(),
						groups: z.string().default('').optional()
					});
				}
				if (newStashType === 'image') {
					formSchema = z.object({
						title: z.string().default('').optional(),
						description: z.string().default('').optional(),
						groups: z.string().default('').optional()
					});
				}

				editDialogOpen = true;

				setTimeout(() => {
					newStashForm = stashlistRoot?.querySelector('#stashlist-form');
	
					if (!newStashForm) return;
	
					newStashForm.addEventListener('submit', async (e) => {
						e.preventDefault();
						const form = e.target as HTMLFormElement;
						const formData = Object.fromEntries(new FormData(form));
						
						try {
							formSchema.parse(formData);
						} catch (err) {
							if (err instanceof z.ZodError) {
								console.log(err.issues);
								err.issues.forEach(issue => {
									newStashFormData[issue.path[0]].error = issue;
								})
							}
							return
						}
						console.log('save' + newStashType.toUpperCase());
						
						browser.runtime.sendMessage({
							['save' + newStashType.charAt(0).toUpperCase() + newStashType.slice(1)]: formData
						})
					})
				}, 100); // needed
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

	<Dialog.Root bind:open={editDialogOpen} portal={null} preventScroll={false} closeOnOutsideClick={false}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Stash new {newStashType}</Dialog.Title>
			</Dialog.Header>
			<form id="stashlist-form" class="space-y-2">
				{#each Object.entries(newStashFormData) as [key, value]}
					{#if value.hidden}
						<Input type="hidden" name={key} value={value.data} />
					{:else}
						<div class="space-y-2">
							<Label for={key}>{value.label}</Label>
							{#if key === 'groups'}
								<Input name={key} type="hidden" bind:value={groupIds} />
								<Tags
									bind:tags={groups}
									placeholder={"Add groups"}
									autoComplete={aviableGroups}
									minChars={0}
									onlyUnique={true}
									cleanOnBlur={true}
									autoCompleteKey={'title'}
									name={'Add groups'}
									onlyAutocomplete
								/>
							{:else}
								<Input name={key} value={value.data} />
							{/if}
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
