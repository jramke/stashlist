<script lang="ts">
	import '../../../app.pcss';

	import browser from 'webextension-polyfill';
	import logo from '~/assets/logo.svg';
	import PageContent from '~/lib/PageContent.svelte';
	import * as Dialog from '~/lib/components/ui/dialog';
	import { Input } from '~/lib/components/ui/input';
	import { Label } from '~/lib/components/ui/label';
	import { Button } from '~/lib/components/ui/button';
	import { onMount } from 'svelte';
	import { Toaster } from '~/lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	import { toast } from 'svelte-sonner';

	type NewStashEdit = {
		[key: string]: {
			label: string;
			data: string;
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
	})

	browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
			if (message.editNewStash) {
				newStashData = message.editNewStash;

				editDialogOpen = true;

				setTimeout(() => {
					newStashForm = stashlistRoot?.querySelector('#stashlist-form');
	
					if (!newStashForm) return;
	
					newStashForm.addEventListener('submit', async (e) => {
						e.preventDefault();
						const form = e.target as HTMLFormElement;
						const formData = new FormData(form);
						
						//TODO: error handling

						browser.runtime.sendMessage({
							newStash: Object.fromEntries(formData)
						})
					})
				}, 100);
			}

			if (message.newStashAdded) {
				editDialogOpen = false;
				console.log(toast);
				toast.success('Successfully created stash');
			}
		}
	);

</script>

<div id="stashlist" class="dark">

	<!-- both not working -->
	<Toaster position="bottom-center" />
	<ModeWatcher />

	<Dialog.Root bind:open={editDialogOpen} portal={null} preventScroll={false}>
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
