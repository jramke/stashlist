<script lang="ts">
	import { onMount } from 'svelte';
	import { listColumns, listLayout } from '$lib/stores';
	import { page } from '$app/stores';
	import { Groups } from '$lib/components/app/nav';
	import { Gradient } from '$lib/components/app';
	import { LayoutGrid, StretchHorizontal, Masonry, Loader } from '@repo/ui/icons';
	import { Slider } from '@repo/ui/components/slider';
	import { Label } from '@repo/ui/components/label';
	import * as RadioGroup from '@repo/ui/components/radio-group';
	import * as Select from '@repo/ui/components/select';
	import { minDelay, setHeightOfElementAsVariable } from '$lib/utils';
	import { Input } from '@repo/ui/components/input';
	import Section from '@repo/ui/components/section';
	import Userinfo from './userinfo.svelte';
	import { Button } from '@repo/ui/components/button';
	import { siteConfig } from '$lib/config/site';
	import { toast } from '@repo/ui/components/sonner';
	import { invalidateAll } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { cn } from '@repo/ui/utils';

	//TODO: search https://www.youtube.com/watch?v=lrzHaTcpRh8

	let busy = false;
	let newStashFormError = '';
	let newStashValue = '';
	let newStashSelectedGroup: any;

	let groups: TODO;
    $: $page.data.groups.then(data => groups = data);

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

    const enhanceNewStashForm: SubmitFunction = () => {
		busy = true;
		let start = Date.now();

		return async ({ result }) => {
			await minDelay(start);
			if (result.type === 'success') {
				invalidateAll();
				await applyAction(result);
				newStashFormError = '';
				newStashValue = '';
				toast.success('Successfully stashed new website');
			} else {
				newStashFormError = 'Something went wrong stashing the website';
			}
			busy = false;
		};
	};

</script>

<Section>
	<div class="flex justify-between items-center gap-5">
		<Groups />
		<Userinfo />
	</div>
</Section>
<div id="topbar" class="sticky top-0 flex justify-between gap-5 z-100">
	<div>
		<form action={siteConfig.appUrl + '/save/new'} method="POST" use:enhance={enhanceNewStashForm}>
			<div class="relative">
				<div class={cn('absolute right-2 top-2 bottom-2 text-muted-foreground')}>
					<Loader class={cn("animate-spin size-6 hidden", busy && 'block')} />
					{#if groups && groups.length > 0}
						<Select.Root bind:selected={newStashSelectedGroup}>
							<Select.Trigger class="p-1 h-full rounded border-none">
								<div class="relative overflow-hidden rounded-full size-4 me-1">
									{#if newStashSelectedGroup?.value}
										<Gradient gradientIndex={newStashSelectedGroup.value} />
									{:else}
										<Gradient gradientIndex={-1} />
									{/if}
								</div>
							</Select.Trigger>
							<Select.Content class="!w-auto">
								<Select.Item value={-1} label={"No group"}>
									No group
								</Select.Item>
								{#each groups as item}
									<Select.Item value={item.gradientIndex} label={item.title}>
										<!-- <div class="relative overflow-hidden rounded-full size-4 me-2">
											<Gradient gradientIndex={item.gradientIndex} />
										</div> -->
										{item.title}
									</Select.Item>
								{/each}
							</Select.Content>
							<Select.Input name="group" />
						</Select.Root>
					{/if}
				</div>
				<Input placeholder="Create new stash" class={cn('w-[500px] max-w-full pe-10')} disabled={busy} name="url" bind:value={newStashValue} />
			</div>
			{#if newStashFormError}
                <p class="text-sm text-destructive mt-1" aria-live="assertive">{newStashFormError}</p>
            {/if}
		</form>
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
