<script lang="ts">
	// import Input from '@repo/ui/components/input/input';
	import * as Avatar from '@repo/ui/components/avatar';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { Button } from '@repo/ui/components/button';
	import * as DropdownMenu from '@repo/ui/components/dropdown-menu';
	import { Sun, Moon, LayoutGrid, StretchHorizontal } from '@repo/ui/icons';
	import { setMode, resetMode } from 'mode-watcher';
	import Breadcrumb from './Breadcrumb.svelte';
	import { Slider } from '@repo/ui/components/slider';
	import { Label } from '@repo/ui/components/label';
	import { listColumns, listLayout } from '$lib/stores';
	import * as RadioGroup from '@repo/ui/components/radio-group';

	//TODO: search https://www.youtube.com/watch?v=lrzHaTcpRh8

	let name = $page.data.user.name;
	$: breadcrumbArray = ['Stashes'];

	$: if (breadcrumbArray) {
		if ($page.route.id?.endsWith('explore')) {
			breadcrumbArray[1] = 'Explore';
		}
		if ($page.route.id?.endsWith('app')) {
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

<div
	class="bg-card/95 sticky top-0 z-50 flex w-full justify-between gap-5 border-b p-5 backdrop-blur"
>
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
	<!-- <DropdownMenu.Root>
		<DropdownMenu.Trigger asChild let:builder>
			<Button builders={[builder]} variant="outline" size="icon">
				<Sun
					class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
				/>
				<Moon
					class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Item on:click={() => setMode('light')}>Light</DropdownMenu.Item>
			<DropdownMenu.Item on:click={() => setMode('dark')}>Dark</DropdownMenu.Item>
			<DropdownMenu.Item on:click={() => resetMode()}>System</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root> -->
</div>
