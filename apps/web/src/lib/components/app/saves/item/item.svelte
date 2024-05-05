<script lang="ts">
	import type { Save, TODO } from '$lib/types';
	
	import { cleanUrl } from '$lib/utils';
	import ItemFooter from './item-footer.svelte';
	import ItemMedia from './item-media.svelte';
	import { Gradient } from '$lib/components/app';
	import { cn } from '@repo/ui/utils';
	import ItemContextMenu from './item-context-menu.svelte';
	import { onMount } from 'svelte';
	import { getItemsContext } from './context';

	// TODO: use let { a,b } = $props();
	export let title: Save['title'];
	export let description: Save['description'];
	export let url: Save['url'];
	export let imageUrl: Save['imageUrl'];
	export let faviconUrl: Save['faviconUrl'];
	export let createdAt: Save['createdAt'];
	export let saveGroups: TODO[] = [];
	export let id: string;
	export let gradientIndex: number;
	export let type: Save['type'];

	const copyUrl = type === 'image' ? imageUrl : url;

	const { copyUrlToClipboard, openEditDialog, openDeleteDialog } = getItemsContext();

	let itemNode: HTMLAnchorElement;

	const handleContextMenu = (event: KeyboardEvent) => {
		if (document.activeElement !== itemNode) return;
		
		if (event.key === 'c' && event.ctrlKey) {
			event.preventDefault();
			copyUrlToClipboard(copyUrl);
		}

		if (event.key === 'e' && event.ctrlKey) {
			event.preventDefault();
			openEditDialog(id);
		}

		if (event.key === 'd' && event.ctrlKey) {
			event.preventDefault();
			openDeleteDialog(id, title);
		}
	};
	
	onMount(() => {
		document.addEventListener('keydown', handleContextMenu);
		return () => {
			document.removeEventListener('keydown', handleContextMenu);
		}
	});

</script>

<ItemContextMenu {id} {title} {copyUrl}>
	<a 
		href={copyUrl}
		{title}
		rel="norefferrer noopener"
		target="_blank" 
		class={cn(
			`relative group shadow shadow-none overflow-hidden h-full rounded-lg bg-card/50 text-card-foreground flex flex-col justify-between border shadow
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
						<h3 class="line-clamp-2 text-lg font-bold break-words">{title}</h3>
					</div>
					<!-- {#if description}
						<span class="mb-2 line-clamp-2 text-sm break-words">{description}</span>
					{/if} -->
					{#if type !== 'image'}
						<div class="flex items-center gap-2">
							{#if faviconUrl}
								<img loading="lazy" class="size-4 shrink-0 -mb-[1.5px]" src={faviconUrl} alt={title} on:error={() => faviconUrl = ''} />
							{:else}
								<div class="rounded-full size-4 shrink-0 -mb-[1.5px] overflow-hidden relative">
									<Gradient {gradientIndex} />
								</div>
							{/if}
							<a
								href={url}
								{title}
								rel="norefferrer noopener"
								target="_blank"
								class="line-clamp-1 text-sm text-muted-foreground break-words"
								tabindex="-1"
							>
								{cleanUrl(url)}
							</a>
						</div>
					{/if}
				</div>
			</div>
		</div>
		<ItemFooter {saveGroups} {createdAt} />
	</a>
</ItemContextMenu>

