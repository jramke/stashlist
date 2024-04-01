<script lang="ts">
    import type { TODO } from '$lib/types';

    import { page } from '$app/stores';
    import { Gradient } from '$lib/components/app';
	import { getRandomIndex, minDelay } from '$lib/utils';
	import { gradients } from '$lib/constants'; 
    import { siteConfig } from '$lib/config/site';
    import { ChevronsUpDown, GripVertical, Inbox, Loader, Pencil, Plus } from '@repo/ui/icons';
    import * as DropdownMenu from '@repo/ui/components/dropdown-menu';
    import { Button, buttonVariants } from '@repo/ui/components/button';
    import * as Dialog from '@repo/ui/components/dialog';
    import { Input } from '@repo/ui/components/input';
    import { ScrollArea } from '@repo/ui/components/scroll-area';
	import { applyAction, enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '@repo/ui/components/sonner';
	import { Label } from '@repo/ui/components/label';

    let groupCounts: TODO;
    $: $page.data.saves.then(saves => groupCounts = saves?.groupCounts);

    let groups: TODO;
    $: $page.data.groups.then(data => groups = data);

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

    let editDialogOpen = false;
    let newDialogOpen = false;
    let gradientIndex = -1;
    let newGroupError = '';
    let editGroupsErrors: TODO[] = [];

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
                editDialogOpen = false;
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
                newDialogOpen = false;
				toast.success('Successfully created group');
			} else {
				newGroupError = 'Invalid group name';
			}
			busy = false;
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
                                    <div class="ms-auto me-0 text-muted-foreground">{noGroupCount}</div>
                                </DropdownMenu.Link>
                                <DropdownMenu.Separator />
                            </div>
                        {/if}
                        <ScrollArea class="max-h-[50vh] data-[scrollbar-visible]:ps-1">
                            {#each groups as { title, id, gradientIndex }}
                                <DropdownMenu.Link href={siteConfig.appUrl + '/group/' + id}>
                                    <div class="rounded-full size-4 overflow-hidden relative me-2">
                                        <Gradient {gradientIndex} />
                                    </div>
                                    {title}
                                    {#if groupCounts && groupCounts[id]}
                                        <div class="ms-auto me-0 text-muted-foreground">{groupCounts[id]}</div>
                                    {/if}
                                </DropdownMenu.Link>
                            {/each}
                        </ScrollArea>
                        <div class="px-1">
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item on:click={() => editDialogOpen = true}>
                                <Pencil class="size-4 me-2" />
                                Edit groups
                            </DropdownMenu.Item>
                            <DropdownMenu.Item on:click={() => newDialogOpen = true}>
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


<Dialog.Root bind:open={editDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Edit groups</Dialog.Title>
            <Dialog.Description>
                Rename and sort your groups.
            </Dialog.Description>
        </Dialog.Header>
        <ScrollArea class="max-h-[60vh]">
            <form class="flex flex-col gap-3 py-2 px-1" method="POST" action={siteConfig.appUrl + '/group/edit'} id="group-edit-form" use:enhance={enhanceEditGroup}>
                {#each groups as { title, id }}
                    <div class="flex gap-2 items-center">
                        <GripVertical class="size-4 cursor-grab text-muted" />
                        <div class="w-full">
                            <Input name={id} value={title} />
                            {#if editGroupsErrors[id]}
                                <p class="text-sm text-destructive mt-1" aria-live="assertive">{editGroupsErrors[id][0]}</p>
                            {/if}
                        </div>
                    </div>
                {/each}
            </form>
        </ScrollArea>
        <Dialog.Footer>
            <Button type="submit" form="group-edit-form">
                {#if busy}
                    <Loader class="size-4 me-2 animate-spin" />
                {/if}
                Update
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={newDialogOpen}>
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
            <Button type="submit" form="group-new-form">
                {#if busy}
                    <Loader class="size-4 me-2 animate-spin" />
                {/if}
                Create
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>