<script lang="ts">
	import '@repo/ui/globals.pcss';
	import '../../../app.pcss';

	import browser from 'webextension-polyfill';
	import { siteConfig } from '@repo/constants';
	import * as Dialog from '@repo/ui/components/dialog';
	import { Input } from '@repo/ui/components/input';
	import { Label } from '@repo/ui/components/label';
	import { Button } from '@repo/ui/components/button';
	import Tags from "@repo/ui/components/tags";
	import { onMount } from 'svelte';
	import { Toaster, toast } from '@repo/ui/components/sonner';
	import { z } from 'zod';
	import { waitForElement } from '../utils';

	type NewStashEdit = {
		[key: string]: {
			label: string;
			data: string;
			error: any;
			hidden: boolean;
		};
	};

	// type StashState = 'loading' | 'fetched' | 'error';
	

	let editDialogOpen = false;
	let newStashFormData: NewStashEdit;
	let newStashType: string;
	let aviableGroups: any[] = [];
	let newStashForm: HTMLFormElement | null | undefined;
	let newStashFormButton: HTMLButtonElement | null | undefined;
	let stashlistRoot: HTMLElement | null | undefined;
	let groups: any[] = [];
	let formSchema: z.ZodSchema<any>;
	// let stashState: Promise<StashState> = new Promise((resolve, reject) => resolve('loading'));

	$: groupIds = groups.map(item => item.id);

	let resolveStashPromise: () => void;
	let rejectStashPromise: (reason?: any) => void;
	const stashStatePromise = new Promise<void>((resolve, reject) => {
		resolveStashPromise = resolve;
		rejectStashPromise = reject;
	});

	onMount(() => {
		const stashlistContainer = document.getElementById('stashlist-container');
		const stashlistContainerRoot = stashlistContainer?.shadowRoot;
		stashlistRoot = stashlistContainerRoot?.querySelector<HTMLElement>('#stashlist-root');
		stashlistRoot?.classList.add('dark');
	})

	browser.runtime.onMessage.addListener(async (message: any) => {
			if (message.editNewStash) {
				newStashFormData = message.editNewStash.form;
				newStashType = message.editNewStash.type;
				aviableGroups = message.editNewStash.groups
				
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
				resolveStashPromise();
				// console.log('dialog opened');
				
				try {
					newStashForm = await waitForElement<HTMLFormElement>('#stashlist-form', stashlistRoot);
					newStashFormButton = await waitForElement<HTMLButtonElement>('#new-stash-button', stashlistRoot);

					if (!newStashForm || !newStashFormButton) {
						console.error('Could not find form or button', newStashForm, newStashFormButton);
						rejectStashPromise();
						return;
					}

					newStashFormButton.addEventListener('click', formButtonClickListener);
					// console.log('form listeners initialized');
					
				} catch (error) {
					console.error('Error while initializing form listeners', error);
					rejectStashPromise();
				}

			}

			if (message.newStashAdded) {
				editDialogOpen = false;
				newStashFormButton?.removeEventListener('click', formButtonClickListener);
				toast.success('Successfully created stash', {
					action: {
						label: 'View',
						onClick: () => window.open(siteConfig.url, '_blank')?.focus(),
					}
				});
				
			}

			if (message.newStashStart) {
				toast.promise(stashStatePromise, {
					loading: 'Stashing...',
					// success: 'Successfully created stash',
					error: 'Could not create stash'
				});
			}
		}
	);

	async function formButtonClickListener(event: MouseEvent) {
		await handleFormButtonClick(event, formSchema);
	}

	async function handleFormButtonClick(e: MouseEvent, formSchema: z.ZodSchema<any>) {
		// console.log('form button clicked');
		e.preventDefault();
		if (!newStashForm) {
			rejectStashPromise();
			return;
		};

		const formData = Object.fromEntries(new FormData(newStashForm));
		try {
			formSchema.parse(formData);
		} catch (err) {
			if (err instanceof z.ZodError) {
				err.issues.forEach(issue => {
					newStashFormData[issue.path[0]].error = issue;
				});
			}
			rejectStashPromise();
			return;
		}
		// console.log('formdata parsed', formData);
		browser.runtime.sendMessage({
			['save' + newStashType.charAt(0).toUpperCase() + newStashType.slice(1)]: formData,
		});
		// console.log('message sent to', 'save' + newStashType.charAt(0).toUpperCase() + newStashType.slice(1));
	}

	function handleDialogOpenChange(open: boolean) {
		if (!open) {
			// closing
			newStashFormButton?.removeEventListener('click', formButtonClickListener);
		}
	}

</script>

<div>

	<Toaster position="bottom-center" />

	<Dialog.Root bind:open={editDialogOpen} portal={null} onOpenChange={handleDialogOpenChange} preventScroll={false} closeOnOutsideClick={false}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Stash new {newStashType}</Dialog.Title>
			</Dialog.Header>
			<form id="stashlist-form" class="space-y-2" on:submit={(e) => e.preventDefault()}>
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
					<Button id="new-stash-button" type="button">Save stash</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

</div>
