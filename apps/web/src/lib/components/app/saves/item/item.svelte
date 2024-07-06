<script lang="ts">
	import type { Save, TODO } from '$lib/types';
	
	import { cleanUrl } from '$lib/utils';
	import ItemMedia from './item-media.svelte';
	import { Gradient } from '$lib/components/app';
	import { cn } from '@repo/ui/utils';
	import ItemContextMenu from './item-context-menu.svelte';
	import { onMount } from 'svelte';
	import { itemsStore } from '$lib/stores';

	// TODO: use let { a,b } = $props();
	export let title: Save['title'];
	export let url: Save['url'];
	export let imageUrl: Save['imageUrl'];
	export let faviconUrl: Save['faviconUrl'];
	export let createdAt: Save['createdAt'];
	export let saveGroups: TODO[] = [];
	export let id: string;
	export let gradientIndex: number;
	export let type: Save['type'];

	$: copyUrl = type === 'image' ? imageUrl : url;

	const { copyUrlToClipboard, openEditDialog, deletedItems, focusedItem, deleteItem } = itemsStore;

	let itemNode: HTMLAnchorElement;

	const handleContextMenu = (event: KeyboardEvent) => {
		if (document.activeElement !== itemNode) return;
		
		if (event.key === 'c' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			copyUrlToClipboard(copyUrl);
		}
		
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			focusedItem.set(document.activeElement as HTMLElement)
			openEditDialog(id);
		}

		if (event.key === 'd' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			deleteItem(id);
		}
	};
	
	onMount(() => {
		document.addEventListener('keydown', handleContextMenu);
		return () => {
			document.removeEventListener('keydown', handleContextMenu);
		}
	});

</script>

{#if !$deletedItems.has(id)}
	<div>
		<ItemContextMenu {id} {copyUrl}>
			<a 
				href={copyUrl}
				{title}
				rel="norefferrer noopener"
				target="_blank" 
				class={cn(
					`relative group overflow-hidden h-full rounded-lg bg-card/50 text-card-foreground flex flex-col justify-between border
					hover:shadow-black hover:bg-card 
					focus-within:shadow-black focus-within:bg-card ring-offset-background
					focus-visible:shadow-black focus-visible:bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`	
				)}
				bind:this={itemNode}
				data-grid-item="true"
			>
				<div>
					<ItemMedia {type} {imageUrl} {title} {url} {gradientIndex} />
					<div class="flex gap-4 p-4">
						<div class="flex flex-col gap-2 min-w-0">
							<div class="flex items-baseline gap-2">
								<h3 class="line-clamp-1 text-lg font-bold break-words">{title}</h3>
							</div>
							{#if type !== 'image'}
								<div class="flex items-center gap-2">
									{#if faviconUrl}
										<img loading="lazy" class="size-4 shrink-0 -mb-[1.5px]" src={faviconUrl} alt={title} on:error={() => faviconUrl = ''} />
									{:else}
										<div class="rounded-full size-4 shrink-0 -mb-[1.5px] overflow-hidden relative">
											<Gradient {gradientIndex} />
										</div>
									{/if}
									<span class="line-clamp-1 text-sm text-muted-foreground break-words">
										{cleanUrl(url)}
									</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</a>
		</ItemContextMenu>
	</div>
{/if}

