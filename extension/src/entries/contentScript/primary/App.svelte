<script lang="ts">
	import '../../../app.pcss';

	import browser from 'webextension-polyfill';
	import logo from '~/assets/logo.svg';
	import PageContent from '~/lib/PageContent.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '~/lib/components/ui/input';
	import { Label } from '~/lib/components/ui/label';
  import { Button } from "~/lib/components/ui/button";

	const logoImageUrl = new URL(logo, import.meta.url).href;

	let editDialogOpen = false;

	browser.runtime.onMessage.addListener(
		(message: any, sender: any, sendResponse: any) => {
			if (message.newStash) {
				const newStashData = message.newStash;
				editDialogOpen = true;
				console.log(newStashData);
			}
		}
	);
</script>

<div id="stashlist" class="dark">
  <div class="fixed p-6 bottom-0">
    <Button>Test</Button>
    <Input value="test" />
  </div>
	<Dialog.Root bind:open={editDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Edit profile</Dialog.Title>
				<Dialog.Description>
					Make changes to your profile here. Click save when you're
					done.
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right">Name</Label>
					<Input id="name" value="Pedro Duarte" class="col-span-3" />
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right">Username</Label>
					<Input id="username" value="@peduarte" class="col-span-3" />
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit">Save changes</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
