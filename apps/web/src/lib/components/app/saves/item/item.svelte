<script lang="ts">
	import type { SelectSave } from '$lib/server/db/schema';
	
	import { cn } from '@repo/ui/utils';
	import ItemContextMenu from './item-context-menu.svelte';
	import { onMount } from 'svelte';
	import { itemsStore, listLayout } from '$lib/stores';
	import { toast } from '@repo/ui/components/sonner';
	import ItemWebsite from './types/item-website.svelte';
	import ItemText from './types/item-text.svelte';
	import ItemColor from './types/item-color.svelte';
	import ItemImage from './types/item-image.svelte';

	export let save: SelectSave;

	$: ({ title, url, imageUrl, faviconUrl, id, gradientIndex, type, text, description } = save);

	$: copyUrlByType = {
		website: url,
		image: imageUrl,
		text: text,
		color: title,
	};
	$: copyUrl = copyUrlByType[type] || url;

	$: linkUrl = type === 'text' || type === 'color' ? '' : copyUrl;

	const { copyToClipboard, openEditDialog, deletedItems, focusedItem, deleteItem, refetchMetadata } = itemsStore;

	let itemNode: HTMLAnchorElement | HTMLDivElement;

	const handleCopyUrl = (event: any) => {
		event.preventDefault();
		copyToClipboard(save);
	}

	const handleContextMenu = (event: KeyboardEvent) => {
		if (document.activeElement !== itemNode) return;
		
		if (event.key === 'c' && (event.metaKey || event.ctrlKey)) {
			handleCopyUrl(event);
			return;
		}
		
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			focusedItem.set(document.activeElement as HTMLElement)
			openEditDialog(id);
			return;
		}

		if (event.key === 'd' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			deleteItem(id);
			return;
		}

		if (event.key === 'r' && (event.metaKey || event.ctrlKey)) {
			if (type !== 'website') {
				toast.info('This action is only available for links');
				return;
			}
			event.preventDefault();
			refetchMetadata(id);
			return;
		}
	};
	
	onMount(() => {
		document.addEventListener('keydown', handleContextMenu);
		if (!linkUrl) {
			itemNode?.addEventListener('click', handleCopyUrl);
		}
		return () => {
			document.removeEventListener('keydown', handleContextMenu);
			itemNode?.removeEventListener('click', handleCopyUrl);
		}
	});

</script>

{#if !$deletedItems.has(id)}
	<div class={$listLayout === 'list' ? 'flex flex-col' : ''}>
		<ItemContextMenu {save}>
			<svelte:element this={linkUrl ? 'a' : 'div'} 
				href={linkUrl}
				{title}
				rel="norefferrer noopener"
				target="_blank" 
				class={cn(
					`relative group overflow-hidden h-full rounded-lg bg-card/50 text-card-foreground flex flex-col justify-between border p-3 cursor-pointer
					hover:shadow-black hover:bg-card 
					focus-within:shadow-black focus-within:bg-card ring-offset-background
					focus-visible:shadow-black focus-visible:bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`	
				)}
				bind:this={itemNode}
				data-grid-item="true"
				tabindex="0"
			>
				<div>
					{#if type === 'website'}
						<ItemWebsite {url} {imageUrl} {title} {faviconUrl} {gradientIndex} />
					{:else if type === 'text'}
						<ItemText {text} {title} />
					{:else if type === 'color'}
						<ItemColor {title} {description} />
					{:else if type === 'image'}
						<ItemImage {imageUrl} {title} {description} {gradientIndex} />
					{/if}
				</div>
			</svelte:element>
		</ItemContextMenu>
	</div>
{/if}

