<script lang="ts">
	import type { Save, TODO } from '$lib/types';

	import { CircleDashed } from '@repo/ui/icons';
	
	import { cleanUrl } from '$lib/utils';
	import ItemFooter from './item-footer.svelte';
	import ItemMedia from './item-media.svelte';
	import ItemActions from './item-actions.svelte';

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

</script>

<div class="overflow-hidden rounded-lg border bg-card text-card-foreground flex flex-col justify-between content-between">
	<div>
		<ItemMedia {type} {imageUrl} {title} {url} {gradientIndex} />
		<div class="flex gap-4 p-4">
			<div class="flex flex-col gap-2 min-w-0">
				<span class="line-clamp-2 text-lg font-bold break-words">{title}</span>
				{#if description}
					<span class="mb-2 line-clamp-2 text-sm break-words">{description}</span>
				{/if}
				{#if type !== 'image'}
					<div class="flex items-center gap-2">
						{#if faviconUrl}
							<img loading="lazy" class="h-4 w-4 shrink-0" src={faviconUrl} alt={title} on:error={() => faviconUrl = ''} />
						{:else}
							<CircleDashed class="h-4 w-4 shrink-0 text-muted-foreground" />
						{/if}
						<a
							href={url}
							{title}
							rel="norefferrer noopener"
							target="_blank"
							class="line-clamp-1 text-sm text-muted-foreground break-words"
						>
							{cleanUrl(url)}
						</a>
					</div>
				{/if}
				
			</div>
			<div class="ml-auto flex">
				<ItemActions {id} {title} {copyUrl} />
			</div>
		</div>
	</div>
	<ItemFooter {saveGroups} {createdAt} />
</div>

