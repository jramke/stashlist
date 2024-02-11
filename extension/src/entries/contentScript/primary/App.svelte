<script lang="ts">
	import '../../../app.pcss';

	import browser from 'webextension-polyfill';
	import logo from '~/assets/logo.svg';
	import PageContent from '~/lib/PageContent.svelte';
	import * as Dialog from '$lib/ui/dialog';
	import { Input } from '~/lib/ui/input';
	import { Label } from '~/lib/ui/label';
	import { Button } from '~/lib/ui/button';

	const logoImageUrl = new URL(logo, import.meta.url).href;

	let editDialogOpen = false;
	let newStashData;
	let newStashForm: HTMLFormElement | null;

	browser.runtime.onMessage.addListener(
		(message: any, sender: any, sendResponse: any) => {
			if (message.newStash) {
				newStashData = message.newStash;

				newStashForm = document.querySelector('#stashlist-ext-form');
				if (!newStashForm) return;

				newStashForm.addEventListener('submit', async (e) => {
					e.preventDefault();
					await newStash(newStashForm!);
				})

				editDialogOpen = true;
				console.log(newStashData);
			}
		}
	);

	async function newStash(form: HTMLFormElement) {
		const formData = new FormData(form);

		try {
			const response = await fetch("https://example.org/post", {
				method: "POST",
				body: formData,
			});
			console.log(await response.json());
		} catch (e) {
			console.error(e);
		}
	}

</script>

<div id="stashlist" class="dark">
	<div class="fixed p-6 bottom-0 bg-card rounded-lg border">
		<Button>Test</Button>
		<Input value="test" />
	</div>
	<Dialog.Root bind:open={editDialogOpen} portal={null} preventScroll={false}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Save stash</Dialog.Title>
				<!-- <Dialog.Description>
					Make changes to your profile here. Click save when you're
					done.
				</Dialog.Description> -->
			</Dialog.Header>
			<form action="POST" id="stashlist-ext-form" class="space-y-2">
				<div class="space-y-2">
					<Label class="text-right">Name</Label>
					<Input id="name" value="Pedro Duarte" />
				</div>
				<Dialog.Footer>
					<Button type="submit">Save stash</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
