<script lang="ts">
    import type { TODO } from '$lib/types';

    import { page } from '$app/stores';
    import { Gradient } from '$lib/components/app';
	import { findMiddleNumberInRange, getRandomIndex, minDelay } from '$lib/utils';
	import { gradients } from '$lib/constants'; 
    import { siteConfig } from '$lib/config/site';
    import { ChevronsUpDown, GripVertical, Inbox, Loader, Pencil, Plus, Trash } from '@repo/ui/icons';
    import * as DropdownMenu from '@repo/ui/components/dropdown-menu';
    import { Button, buttonVariants } from '@repo/ui/components/button';
    import * as Dialog from '@repo/ui/components/dialog';
    import { Input } from '@repo/ui/components/input';
    import { ScrollArea } from '@repo/ui/components/scroll-area';
	import { applyAction, enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from '@repo/ui/components/sonner';
	import { Label } from '@repo/ui/components/label';
    import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from "svelte-dnd-action";
    import { fade } from 'svelte/transition';
	import { cubicIn } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { cn } from '@repo/ui/utils';
	import { editGroupsDialogOpen, newGroupDialogOpen } from '$lib/stores';

    let groupCounts: TODO;
    $: $page.data.saves.then(saves => groupCounts = saves?.groupCounts);

    let groups: TODO;
    $: if (typeof $page.data.groups?.then === "function") {
        $page.data.groups.then(data => groups = data);
    } else {
        groups = $page.data.groups;
    }

    let noGroupCount: number | undefined;
	$: $page.data.saves.then(data => noGroupCount = data?.noGroupCount);

    $: breadcrumbArray = [{ title: 'Stashes', gradientIndex: null }];

    $: if (breadcrumbArray) {
		if ($page.route.id?.endsWith('unsorted')) {
			breadcrumbArray[1] = { title: 'Unsorted', gradientIndex: null };
		}
		if ($page.route.id?.endsWith('main')) {
			breadcrumbArray[1] = { title: 'All', gradientIndex: null };
		}
		if ($page.data.currentGroup) {
			breadcrumbArray[1] = { title: $page.data.currentGroup.title, gradientIndex: $page.data.currentGroup.gradientIndex };
		}
	}

    let gradientIndex = -1;
    let newGroupError = '';
    let editGroupsErrors: TODO[] = [];
    let movedGroupStartIndex = -1;
    let groupDeleteItems: TODO[] = [];
    let groupsDragging = false;
    $: deleteGroupId = '';
    let deleteGroupForm: HTMLFormElement;
    let deleteGroupZone: HTMLElement;
    let draggedGroupEl: any;

    let busy = false;

    const enhanceEditGroup: SubmitFunction = () => {
        busy = true;
        let start = Date.now();
    
		return async ({ result }) => {
            await minDelay(start);
            if (result.type === 'success') {
                invalidateAll();
                applyAction(result);
                editGroupsErrors = [];
                editGroupsDialogOpen.set(false)
                toast.success('Successfully updated groups');
            } else {
                editGroupsErrors = result.data.form.errors ?? 'Invalid group name'; // ??: why Property 'data' does not exist on type???
            }
            busy = false;
		};
	};

    const enhanceNewGroupForm: SubmitFunction = () => {	
		busy = true;
        let start = Date.now();

		return async ({ result }) => {      
            await minDelay(start);     
			if (result.type === 'success') {
				invalidateAll();
				await applyAction(result);
                newGroupError = '';
                newGroupDialogOpen.set(false);
				toast.success('Successfully created group');
			} else {
				newGroupError = 'Invalid group name';
			}
			busy = false;
            gradientIndex = -1;
		};
	};

    const enhanceDeleteGroupForm: SubmitFunction = ({ formData }) => {
		busy = true;
        let start = Date.now();

        formData.set('id', deleteGroupId);
        formData.set('isOnCurrentSlug', $page.params.slug ? 'true' : 'false');      

		return async ({ result }) => {	
            await minDelay(start);   	
			if (result.type === 'success' || result.type === 'redirect') {
				invalidateAll();
				await applyAction(result);
				editGroupsErrors = [];
                toast.success('Successfully deleted group');
				if (result.type === 'redirect') {
					goto(result.location);
                }
            } else {
                editGroupsDialogOpen.set(false);
                invalidateAll();
                toast.error('Failed to delete group');
            }
            busy = false;
            deleteGroupId = '';
		};
	};

    const handleNewGroupInput = (event: InputEvent) => {
        const input = event.target as HTMLInputElement;
        if (!input) return;
        if (input.value === '') {
            gradientIndex = -1;
            return;
        }
        gradientIndex = getRandomIndex(gradients);
    }

    function handleDndFinalizeDelete(e: any) {
        deleteGroupId = e.detail.info.id;
        
        if (!deleteGroupForm) {
            toast.error('Failed to delete group');
            editGroupsDialogOpen.set(false);
            return;
        }
        
        deleteGroupForm.requestSubmit();
        groupsDragging = false;
    }

    function handleDndConsiderDelete(e: any) {        
        groupsDragging = true;
        deleteGroupZone.style.transform = 'scale(1.01)';
        
        if (draggedGroupEl.children) {
            draggedGroupEl.children[0].style.transform = 'scale(0.99)';
            draggedGroupEl.children[0].style.opacity = 0.75;
        }
    }

    function handleDndConsider(e: any) {
        groupsDragging = true;
        movedGroupStartIndex = groups.findIndex((item: any) => item.id === e.detail.info.id);
        groups = e.detail.items;
        deleteGroupZone.style.transform = '';
    }

    async function handleDndFinalize(e: any) {
        groups = e.detail.items;
        groupsDragging = false;

        if (e.detail.items.length === 1 || movedGroupStartIndex === -1) {
            groups = e.detail.items;
            return;
        }

        const movedItemNewPos = groups.findIndex((item: any) => item.id === e.detail.info.id);

        if (movedGroupStartIndex === movedItemNewPos) {
            groups = e.detail.items;
            return;
        }

        busy = true;
        let start = Date.now();

        // const movedItemSortIndex = groups[movedItemNewPos].sortIndex;
        const prevItemSortIndex = groups[movedItemNewPos - 1]?.sortIndex;
        const nextItemSortIndex = groups[movedItemNewPos + 1]?.sortIndex;

        let newSortIndex = 0;

        let response;

        // item was placed at the start
        if (!prevItemSortIndex) {
            newSortIndex = 0.5
        }
        
        // item was placed at the end
        if (!nextItemSortIndex) {
            newSortIndex = prevItemSortIndex + 100;
        }

        if (prevItemSortIndex && nextItemSortIndex) {
            newSortIndex = findMiddleNumberInRange(prevItemSortIndex, nextItemSortIndex);
        }

        console.log(newSortIndex, findMiddleNumberInRange(prevItemSortIndex, nextItemSortIndex));
        

        if (newSortIndex === -1) {
            // unexpected error
            response = await fetch('/api/groups/sort?type=reset', {
                method: 'POST',
            });
            invalidateAll();
            toast.error('Failed to update group order');
            editGroupsDialogOpen.set(false);
            busy = false;
            return;
        }
        
        //TODO: update the new sortindex in the groups array
        // call the db api only if user clicks update to reduce loaders
        response = await fetch('/api/groups/sort?type=update', {
            method: 'POST',
            body: JSON.stringify({
                id: e.detail.info.id,
                sortIndex: newSortIndex,
            }),
        });

        if (response.status === 200 && response.ok) {
            if (newSortIndex % 1 !== 0 || newSortIndex >= Number.MAX_SAFE_INTEGER) {
                response = await fetch('/api/groups/sort?type=reset', {
                    method: 'POST',
                });
            }
        }

        if (response.status !== 200) {
            toast.error('Failed to update group order');
            editGroupsDialogOpen.set(false);
        }

        await minDelay(start, 350);
        await invalidateAll();
        busy = false;
    }

    function transformDraggedElement(draggedEl: any) {       
        draggedEl.style.zIndex = 'calc(infinity)';
        if (draggedEl.children[0]) {
            draggedEl.children[0].style.transform = 'scale(1.02) rotate(-1deg)';
        }
        draggedGroupEl = draggedEl;
    }

</script>

<div class="text-2xl">
    <p class="flex gap-2 items-baseline leading-none">
        {#each breadcrumbArray as item, i}
            {#if i === breadcrumbArray.length - 1}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger class={'flex focusable font-bold text-2xl items-baseline'}>
                        {#if item.gradientIndex !== null}
                            <div class="rounded-full size-4 overflow-hidden relative me-2">
                                <Gradient gradientIndex={item.gradientIndex} />
                            </div>
                        {/if}
                        <span class="me-1">
                            {item.title}
                        </span>
                        <Button variant="ghost" size="icon" class="size-7">
                            <span class="sr-only">Select view</span>
                            <ChevronsUpDown class="size-4" />
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="start" class="min-w-[12rem] px-0">
                        {#if noGroupCount}
                            <div class="px-1">
                                <DropdownMenu.Link href={siteConfig.appUrl + '/unsorted'}>
                                    <Inbox class="size-4 me-2" />
                                    Unsorted
                                    <div class="ps-3 ms-auto me-0 text-muted-foreground">{noGroupCount}</div>
                                </DropdownMenu.Link>
                                <DropdownMenu.Separator />
                            </div>
                        {/if}
                        {#if groups && groups.length > 0}
                            <ScrollArea class="max-h-[30vh] px-1 data-[scrollbar-visible=true]:pe-0">
                                {#each groups as { title, id, gradientIndex }}
                                    <DropdownMenu.Link href={siteConfig.appUrl + '/group/' + id}>
                                        <div class="rounded-full size-4 overflow-hidden relative me-2">
                                            <Gradient {gradientIndex} />
                                        </div>
                                        {title}
                                        {#if groupCounts && groupCounts[id]}
                                            <div class="ps-3 ms-auto me-0 text-muted-foreground">{groupCounts[id]}</div>
                                        {/if}
                                    </DropdownMenu.Link>
                                {/each}
                            </ScrollArea>
                        {/if}
                        <div class="px-1">
                            {#if groups && groups.length > 0}
                                <DropdownMenu.Separator />
                                <DropdownMenu.Item on:click={() => editGroupsDialogOpen.set(true)}>
                                    <Pencil class="size-4 me-2" />
                                    Edit groups
                                </DropdownMenu.Item>
                            {/if}
                            <DropdownMenu.Item on:click={() => newGroupDialogOpen.set(true)}>
                                <Plus class="size-4 me-2" />
                                New Group 
                            </DropdownMenu.Item>
                        </div>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>					
            {:else}
                <span class="text-muted-foreground">
                    {#if i === 0}
                        <a class="focusable" href={siteConfig.appUrl}>{item.title}</a>
                    {:else}
                        {item.title}
                    {/if}
                </span>
                <span class="text-muted-foreground">/</span>
            {/if}
        {/each}
    </p>   
</div>



<Dialog.Root bind:open={$editGroupsDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Edit groups</Dialog.Title>
            <Dialog.Description>
                Rename and sort your groups.
            </Dialog.Description>
        </Dialog.Header>
        <ScrollArea class="p-1 ps-0 max-h-[60vh]">
            <form method="POST" action={siteConfig.appUrl + '/group/edit'} id="group-edit-form" use:enhance={enhanceEditGroup}>
                <div class={cn("flex flex-col gap-4 !outline-none", busy && 'pointer-events-none opacity-50')} use:dndzone={{items: groups, transformDraggedElement: transformDraggedElement, flipDurationMs: 300}} on:consider={handleDndConsider} on:finalize={handleDndFinalize}>
                    {#each groups as item(item.id)}
                        <div animate:flip={{ duration: 300}}>
                            <div class="flex gap-2 items-center relative transition-transform">
                                <GripVertical class="size-4 cursor-grab text-muted" />
                                <div class="w-full">
                                    <div class="relative">
                                        <div class="absolute overflow-hidden left-2 top-2 bottom-2 aspect-square rounded-full">
                                            <Gradient gradientIndex={item.gradientIndex} />
                                        </div>
                                        <Input class="ps-10 bg-background" name={item.id} value={item.title} />
                                    </div>
                                    {#if editGroupsErrors[item.id]}
                                        <p class="text-sm text-destructive mt-1" aria-live="assertive">{editGroupsErrors[item.id][0]}</p>
                                    {/if}
                                </div>

                                {#if item[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
                                    <div in:fade={{duration:200, easing: cubicIn}} class="absolute  opacity-50 inset-0 m-0 visible">
                                        <div class="ms-4 h-10 border border-dashed rounded-md"></div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </form>
        </ScrollArea>
        <Dialog.Footer>
            <div 
                bind:this={deleteGroupZone}
                use:dndzone={{items: groupDeleteItems, transformDraggedElement: transformDraggedElement, flipDurationMs: 300}} on:consider={handleDndConsiderDelete} on:finalize={handleDndFinalizeDelete} 
                class={cn("ms-0 me-auto border border-dashed rounded-md py-3 px-4 text-sm text-muted-foreground !outline-none transition-all", groupsDragging && 'w-full border-destructive')}
            >
                <!-- <span class="sr-only">Delte group</span>
                <Trash class="size-4" /> -->
                Drop here to delete
            </div>
            <form bind:this={deleteGroupForm} class="hidden" method="POST" action={siteConfig.appUrl + '/group/delete'} use:enhance={enhanceDeleteGroupForm}>
                <!-- <input type="hidden" name="id" bind:value={deleteGroupId}>
                <input type="hidden" name="isOnCurrentSlug" value={$page.params.slug ? true : false}> -->
            </form>
            <Button type="submit" form="group-edit-form" disabled={busy} class={cn(groupsDragging && 'hidden')}>
                {#if busy}
                    <Loader class="size-4 me-2 animate-spin" />
                {/if}
                Update
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={$newGroupDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>New group</Dialog.Title>
        </Dialog.Header>
        <form method="POST" action={siteConfig.appUrl + '/group/new'} id="group-new-form" use:enhance={enhanceNewGroupForm}>
            <Label for="title">Title</Label>
            <div class="relative mt-2">
                <div class="absolute overflow-hidden left-2 top-2 bottom-2 aspect-square rounded-full">
                    <Gradient {gradientIndex} />
                </div>
                <Input class="ps-10" name="title" on:input={handleNewGroupInput} />
            </div>
            {#if newGroupError}
                <p class="text-sm text-destructive mt-1" aria-live="assertive">{newGroupError}</p>
            {/if}
            <input type="hidden" name="gradientIndex" value={gradientIndex}>
        </form>
        <Dialog.Footer>
            <Button type="submit" form="group-new-form" disabled={busy}>
                {#if busy}
                    <Loader class="size-4 me-2 animate-spin" />
                {/if}
                Create
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>