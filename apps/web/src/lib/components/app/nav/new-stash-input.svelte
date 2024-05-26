<script lang="ts">
	import type { SubmitFunction } from "@sveltejs/kit";
	import type { TODO } from "$lib/types";

	import { onMount } from "svelte";
	import { applyAction, enhance } from "$app/forms";
	import { afterNavigate, invalidateAll } from "$app/navigation";
	import { page } from "$app/stores";
	import { siteConfig } from "$lib/config/site";
	import { minDelay } from "$lib/utils";
	import { Loader } from "@repo/ui/icons";
	import { Input } from "@repo/ui/components/input";
	import { toast } from "@repo/ui/components/sonner";
    import * as Select from "@repo/ui/components/select";
	import { Gradient } from "$lib/components/app";
	import { cn } from "@repo/ui/utils";
	import { get } from "svelte/store";
	import { newStashStore } from "$lib/stores";

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

        document.addEventListener('keydown', handleNewStashShortcut);
        return () => document.removeEventListener('keydown', handleNewStashShortcut);
    });

    afterNavigate(() => {
		newStashSelectedGroup = getNewStashSelectedGroup();
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

    const handleNewStashShortcut = (e: KeyboardEvent) => {       
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
    }

    const enhanceNewStashForm: SubmitFunction = () => {
		busy = true;
		let start = Date.now();

		return async ({ result }) => {
			await minDelay(start);
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
	}

</script>

<form action={siteConfig.appUrl + '/save/new'} method="POST" bind:this={newStashForm} use:enhance={enhanceNewStashForm}>
    <div class="relative">
        <Input autocomplete="off" id="new-stash-input" placeholder="Create new stash" class={cn('min-w-0 w-full max-w-full pe-14')} disabled={busy} name="url" bind:value={newStashValue} on:keydown={handleNewStashInputKeydown} />
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