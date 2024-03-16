<script lang="ts">
	import { page } from '$app/stores';
	import { LayoutGrid, StretchHorizontal, Masonry } from '@repo/ui/icons';
	import Breadcrumb from './Breadcrumb.svelte';
	import { Slider } from '@repo/ui/components/slider';
	import { Label } from '@repo/ui/components/label';
	import { listColumns, listLayout } from '$lib/stores';
	import * as RadioGroup from '@repo/ui/components/radio-group';
	import { onMount } from 'svelte';

	//TODO: search https://www.youtube.com/watch?v=lrzHaTcpRh8

	$: breadcrumbArray = ['Stashes'];

	onMount(() => {
		document.documentElement.style.setProperty('--topbar-height', (document.getElementById('topbar')?.clientHeight ?? 0) + 'px');
	})

	$: if (breadcrumbArray) {
		if ($page.route.id?.endsWith('unsorted')) {
			breadcrumbArray[1] = 'Unsorted';
		}
		if ($page.route.id?.endsWith('main')) {
			breadcrumbArray[1] = 'All';
		}
		if ($page.data.currentGroup) {
			breadcrumbArray[1] = $page.data.currentGroup.title;
		}
	}

	function sliderValueChange(value: number[]) {
		listColumns.set(value[0]);
	}

	function layoutValueChange(value: string | undefined) {
		if (!value) return;
		listLayout.set(value);
	}
</script>

<div id="topbar" class="bg-card sticky top-0 flex w-full justify-between border-b gap-5 p-5 z-100">
	<!-- <Input type="search" placeholder="Search" />
	<div class="flex items-center gap-3">
		<Avatar.Root>
			<Avatar.Image src={`${base}/gradient.png`} alt={name} />
			<Avatar.Fallback>{name.substring(0, 2).toUpperCase()}</Avatar.Fallback>
		</Avatar.Root>
		<p class="whitespace-nowrap">
			<span class="text-muted-foreground">Hi, </span>
			<span class="font-bold">{name}</span>
		</p>
	</div> -->
	<Breadcrumb path={breadcrumbArray} />
	<div class="flex gap-6 items-center">
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
		<Slider
			class="w-[200px]"
			value={[$listColumns]}
			max={5}
			step={1}
			min={1}
			onValueChange={sliderValueChange}
		/>
	</div>
</div>
