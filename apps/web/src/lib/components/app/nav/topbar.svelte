<script lang="ts">
	import { onMount } from 'svelte';
	import { listColumns, listLayout, liveView } from '$lib/stores';
	import { page } from '$app/stores';
	import { Groups } from '$lib/components/app/nav';
	import { Gradient } from '$lib/components/app';
	import { LayoutGrid, StretchHorizontal, Masonry, Loader } from '@repo/ui/icons';
	
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
	import { afterNavigate, invalidateAll } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { cn } from '@repo/ui/utils';
	import type { TODO } from '$lib/types';
	import { Switch } from '@repo/ui/components/switch';
	import ColumnSlider from './column-slider.svelte';

	//TODO: search https://www.youtube.com/watch?v=lrzHaTcpRh8

	let busy = false;
	let newStashFormError = '';
	let newStashValue = '';
	let newStashSelectedGroup = getNewStashSelectedGroup();
	let newStashInput: HTMLInputElement;
	let newStashForm: HTMLFormElement;

	let groups: TODO;
    $: if (typeof $page.data.groups?.then === "function") {
        $page.data.groups.then(data => groups = data);
    } else {
        groups = $page.data.groups;
    }

	afterNavigate(() => {
		newStashSelectedGroup = getNewStashSelectedGroup();
	});

	onMount(() => {
		const topbar = document.getElementById('topbar');
		const setVar = () => {
			setHeightOfElementAsVariable(topbar, '--topbar-height');
		}
		setVar();
		window.addEventListener('resize', setVar);

		newStashInput = document.getElementById('new-stash-input') as HTMLInputElement;

		return () => window.removeEventListener('resize', setVar);
	})


	function layoutValueChange(value: string | undefined) {
		if (!value) return;
		listLayout.set(value);
	}

    const enhanceNewStashForm: SubmitFunction = () => {
		busy = true;
		let start = Date.now();

		return async ({ result }) => {
			await minDelay(start);
			console.log(result);
			if (result.type !== 'success' || result?.data?.form.message.type === 'error') {
				newStashFormError = 'Something went wrong stashing the website';
			} else {
				invalidateAll();
				await applyAction(result);
				newStashFormError = '';
				newStashValue = '';
				toast.success('Successfully stashed new website');
			}
			busy = false;
		};
	};

	const getGradientIndexByGroupId = (groupId: string) => {
		if (groups) {
			const group = groups.find((group: any) => group.id === groupId);
			if (group) {
				return group.gradientIndex;
			}
		}
		return -1;
	}

	const handleNewStashInputKeydown = (event: KeyboardEvent) => {		
		if (document.activeElement === newStashInput && event.key === 'Enter') {
			newStashForm?.requestSubmit();
		}
	}

	function getNewStashSelectedGroup() {
		return { value: $page.data.currentGroup?.id || '', label: $page.data.currentGroup?.title || 'No group' };
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
		<form action={siteConfig.appUrl + '/save/new'} method="POST" bind:this={newStashForm} use:enhance={enhanceNewStashForm}>
			<div class="relative">
				<Input id="new-stash-input" placeholder="Create new stash" class={cn('min-w-0 w-full max-w-full pe-14')} disabled={busy} name="url" bind:value={newStashValue} on:keydown={handleNewStashInputKeydown} />
				<div class={cn('absolute right-2 top-2 bottom-2 text-muted-foreground')}>
					<Loader class={cn("animate-spin size-6 hidden", busy && 'block')} />
					{#if groups && groups.length > 0 && !busy}
						<Select.Root bind:selected={newStashSelectedGroup}>
							<Select.Trigger class="p-1 h-full rounded border-none">
								<div class="relative overflow-hidden rounded-full size-4 me-1">
									{#if newStashSelectedGroup?.value}
										<Gradient gradientIndex={getGradientIndexByGroupId(newStashSelectedGroup.value)} />
									{:else}
										<Gradient gradientIndex={-1} />
									{/if}
								</div>
							</Select.Trigger>
							<Select.Content class="!w-auto">
								<Select.Item value={''} label={"No group"}>
									No group
								</Select.Item>
								{#each groups as item}
									<Select.Item value={item.id} label={item.title}>
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
				<input type="hidden" name="groups" value={newStashSelectedGroup.value}>
			</div>
			{#if newStashFormError}
				<p class="text-sm text-destructive mt-1" aria-live="assertive">{newStashFormError}</p>
            {/if}
		</form>
	</div>
	<div class="flex gap-6 flex-wrap">
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
		<div>
			<p class="text-xs text-muted-foreground mb-1">Columns</p>
			<ColumnSlider />
		</div>
	</div>
</div>
