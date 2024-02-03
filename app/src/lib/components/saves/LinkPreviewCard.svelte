<script lang="ts">
	import type { Save } from '$lib/types';

	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { MoreHorizontal } from 'lucide-svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import { cleanUrl } from '$lib/utils';
	import Waves from '$lib/placeholder/waves.svelte';

	// TODO: use let { a,b } = $props();
	export let title: Save['title'];
	export let description: Save['description'];
	export let url: Save['url'];
	export let imageUrl: Save['imageUrl'];
	export let faviconUrl: Save['faviconUrl'];
</script>

<div class="overflow-hidden rounded-lg border bg-card text-card-foreground">
	<a href={url} {title} rel="norefferrer noopener" target="_blank" class="aspect-og relative flex overflow-hidden border-b">
		<!-- TODO: cool css or svg placeholder -->
		<Waves class="absolute inset-0 h-full w-full" />
		<img loading="lazy" src={imageUrl} alt={title} class="absolute inset-0 object-cover h-full w-full">
	</a>
	<div class="flex gap-4 p-4">
		<div class="flex flex-col gap-2">
			<span class="line-clamp-2 text-lg font-bold">{title}</span>
			{#if description}
				<span class="line-clamp-2 text-sm mb-2">{description}</span>
			{/if}
			<div class="flex gap-2 items-center">
				<img loading="lazy" class="w-4 h-4" src={faviconUrl} alt={title}>
				<a href={url} {title} rel="norefferrer noopener" target="_blank" class="line-clamp-1 text-muted-foreground text-sm">
					{cleanUrl(url)}
				</a>
			</div>
		</div>
		<div class="flex ml-auto">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class={buttonVariants({ variant: "ghost" })}>
					<MoreHorizontal class="h-4 w-4" />
					<span class="sr-only">Open menu</span>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Group>
						<DropdownMenu.Item>Edit</DropdownMenu.Item>
						<DropdownMenu.Item>Delte</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
</div>
