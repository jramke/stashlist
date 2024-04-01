<script lang="ts">
	import { onMount } from 'svelte';
	import { listColumns, listLayout } from '$lib/stores';
	import { page } from '$app/stores';
	import { Groups } from '$lib/components/app/nav';
	import { LayoutGrid, StretchHorizontal, Masonry } from '@repo/ui/icons';
	import { Slider } from '@repo/ui/components/slider';
	import { Label } from '@repo/ui/components/label';
	import * as RadioGroup from '@repo/ui/components/radio-group';
	import { setHeightOfElementAsVariable } from '$lib/utils';
	import { Input } from '@repo/ui/components/input';
	import Section from '@repo/ui/components/section';
	import Userinfo from './userinfo.svelte';
	import { Button } from '@repo/ui/components/button';
	import { siteConfig } from '$lib/config/site';

	//TODO: search https://www.youtube.com/watch?v=lrzHaTcpRh8

	

	onMount(() => {
		const topbar = document.getElementById('topbar');
		const setVar = () => {
			setHeightOfElementAsVariable(topbar, '--topbar-height');
		}
		setVar();
		window.addEventListener('resize', setVar);
		return () => window.removeEventListener('resize', setVar);
	})

	function sliderValueChange(value: number[]) {
		listColumns.set(value[0]);
	}

	function layoutValueChange(value: string | undefined) {
		if (!value) return;
		listLayout.set(value);
	}
</script>

<Section>
	<div class="flex justify-between items-center gap-5">
		<Groups />
		<Userinfo />
	</div>
</Section>
<div id="topbar" class="sticky top-0 flex justify-between gap-5 z-100">
	<div>
		<Input type="search" placeholder="https://" class="min-w-[500px]" />
	</div>
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
