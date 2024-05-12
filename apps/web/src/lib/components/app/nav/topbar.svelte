<script lang="ts">
	import { onMount } from 'svelte';
	import { listLayout, liveView } from '$lib/stores';
	import { page } from '$app/stores';
	import { Groups } from '$lib/components/app/nav';
	import { LayoutGrid, StretchHorizontal, Masonry } from '@repo/ui/icons';
	
	import { Label } from '@repo/ui/components/label';
	import * as RadioGroup from '@repo/ui/components/radio-group';
	import { setHeightOfElementAsVariable } from '$lib/utils';
	import Section from '@repo/ui/components/section';
	import Userinfo from './userinfo.svelte';
	import type { TODO } from '$lib/types';
	import { Switch } from '@repo/ui/components/switch';
	import ColumnSlider from './column-slider.svelte';
	import NewStashInput from './new-stash-input.svelte';

	//TODO: search https://www.youtube.com/watch?v=lrzHaTcpRh8

	let groups: TODO;
    $: if (typeof $page.data.groups?.then === "function") {
        $page.data.groups.then(data => groups = data);
    } else {
        groups = $page.data.groups;
    }

	$: isGroupsPage = $page.route.id?.endsWith('groups');

	onMount(() => {
		const topbar = document.getElementById('topbar');
		const setVar = () => {
			setHeightOfElementAsVariable(topbar, '--topbar-height');
		}
		setVar();
		window.addEventListener('resize', setVar);

		return () => window.removeEventListener('resize', setVar);
	})

	function layoutValueChange(value: string | undefined) {
		if (!value) return;
		listLayout.set(value);
	}

</script>

<Section class="pt-0">
	<div class="flex justify-between items-center gap-5">
		<Groups />
		<Userinfo />
	</div>
</Section>
<div id="topbar" class="flex justify-between gap-8 z-100 flex-wrap">
	<div class="max-w-[500px] w-full">
		<NewStashInput />
	</div>
	<div class="flex gap-6 flex-wrap">
		{#if !isGroupsPage}
			<div>
				<p class="text-xs text-muted-foreground mb-1">Live view</p>
				<Switch checked={$liveView} onCheckedChange={(checked) => liveView.set(checked)} />
			</div>
			<div>
				<p class="text-xs text-muted-foreground mb-1">Layout</p>
				<RadioGroup.Root value={$listLayout} class="flex gap-2" onValueChange={layoutValueChange}>
					<Label for="grid" class="flex flex-col items-center justify-between opacity-50 cursor-pointer [&:has([data-state=checked])]:opacity-100">
						<RadioGroup.Item value="grid" id="grid" class="sr-only" aria-label="grid" />
						<LayoutGrid class="h-5 w-5" />
					</Label>
					<Label for="list" class="flex flex-col items-center justify-between opacity-50 cursor-pointer [&:has([data-state=checked])]:opacity-100">
						<RadioGroup.Item value="list" id="list" class="sr-only" aria-label="list" />
						<StretchHorizontal class="h-5 w-5" />
					</Label>
					<Label for="masonry" class="flex flex-col items-center justify-between opacity-50 cursor-pointer [&:has([data-state=checked])]:opacity-100">
						<RadioGroup.Item value="masonry" id="masonry" class="sr-only" aria-label="masonry" />
						<Masonry class="h-5 w-5" />
					</Label>
				</RadioGroup.Root>
			</div>
		{/if}
		<div>
			<p class="text-xs text-muted-foreground mb-1">Columns</p>
			<!-- {#if isGroupsPage}
				<ColumnSlider max={5} min={2} />
			{:else}
			{/if} -->
			<ColumnSlider max={5} min={1} />
		</div>
	</div>
</div>
