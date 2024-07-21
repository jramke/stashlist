<script lang="ts">
	import type { SubmitFunction } from "@sveltejs/kit";
	import type { TODO } from "$lib/types";

	import { onMount } from "svelte";
	import { applyAction, enhance } from "$app/forms";
	import { afterNavigate, invalidateAll } from "$app/navigation";
	import { page } from "$app/stores";
	import { siteConfig } from '@repo/constants';
	import { minDelay } from "$lib/utils";
	import { CornerDownLeft, Loader } from "@repo/ui/icons";
	import { Input } from "@repo/ui/components/input";
	import { toast } from "@repo/ui/components/sonner";
    import * as Select from "@repo/ui/components/select";
	import { Gradient } from "$lib/components/app";
	import { cn } from "@repo/ui/utils";
	import { get } from "svelte/store";
	import { newStashStore } from "$lib/stores";
	import { ScrollArea } from "@repo/ui/components/scroll-area";
	import { Shortcut } from "@repo/ui/components/shortcut";

    let busy = false;
	let newStashFormError = '';
	let newStashValue = '';
	let newStashSelectedGroup = getNewStashSelectedGroup();
	let inputNode: HTMLInputElement;
	let newStashForm: HTMLFormElement;

    let groups: TODO;
    $: if (typeof $page.data.groups?.then === "function") {
        $page.data.groups.then(data => groups = data);
    } else {
        groups = $page.data.groups;
    }

    // const store = newStashStore;
    // setNewStashContext();
    const { focusNewStashInput, newStashInput, setNewStashInput } = newStashStore;

    onMount(() => {
        inputNode = document.getElementById('new-stash-input') as HTMLInputElement;
        setNewStashInput(inputNode);
        focusNewStashInput();

        document.addEventListener('keydown', handleNewStashKeydown);
        return () => document.removeEventListener('keydown', handleNewStashKeydown);
    });

    afterNavigate(() => {
		newStashSelectedGroup = getNewStashSelectedGroup();
        focusNewStashInput();
	});

    const getGradientIndexByGroupId = (groupId: string) => {
		if (groups) {
			const group = groups.find((group: any) => group.id === groupId);
			if (group) {
				return group.gradientIndex;
			}
		}
		return -1;
	}

	function getNewStashSelectedGroup() {
		return { value: $page.data.currentGroup?.id || '', label: $page.data.currentGroup?.title || 'No group' };
	}

    const handleNewStashInputKeydown = (event: KeyboardEvent) => {		
		if (document.activeElement === get(newStashInput) && event.key === 'Enter') {
			newStashForm?.requestSubmit();
		}
	}

    const handleNewStashKeydown = (e: KeyboardEvent) => {       
        if (e.key === 'm' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            focusNewStashInput();
            return;
        }
        if (e.code === 'Escape' && document.activeElement === $newStashInput) {
            e.preventDefault();
            $newStashInput?.blur();
            return;
        }

        // used to trigger the grid-arrow-keys action 
        if (e.key === 'ArrowDown' && document.activeElement === $newStashInput) {
            e.preventDefault();
            $newStashInput?.blur();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown' }));
            return;
        }
    }

    const enhanceNewStashForm: SubmitFunction = () => {
		busy = true;
		let start = Date.now();

		return async ({ result }) => {
			await minDelay(start);
			if (result.type !== 'success' || result?.data?.form.message.type === 'error') {
				newStashFormError = 'Something went wrong creating the stash. Please try again.';
			} else {
				invalidateAll();
				await applyAction(result);
				newStashFormError = '';
				newStashValue = '';
				toast.success('New stash created');
			}
			busy = false;
            focusNewStashInput();
		};
	}

</script>

<form action={siteConfig.appUrl + '/save/new'} method="POST" bind:this={newStashForm} use:enhance={enhanceNewStashForm}>
    <div class="relative">
        {#if newStashValue}
            <span class="text-muted-foreground text-xs absolute bottom-full right-0 mb-2 text-nowrap flex items-center gap-1 opacity-70">
                press <span class="font-semibold text-foreground/90">Enter</span> <CornerDownLeft class="size-4 text-foreground/90" /> to submit
            </span>
        {/if}
        <Input autocomplete="off" id="new-stash-input" placeholder="Create new stash" class={cn('min-w-0 w-full max-w-full pe-14')} disabled={busy} name="input" bind:value={newStashValue} on:keydown={handleNewStashInputKeydown} />
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
                    <Select.Content class="!w-auto px-0" align="start">
                        <ScrollArea class="max-h-[30vh] px-1 data-[scrollbar-visible=true]:pe-0">
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
                        </ScrollArea>
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