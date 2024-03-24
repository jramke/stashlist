<script lang="ts">
	import type { TODO } from '$lib/types';
    import type { SubmitFunction } from '@sveltejs/kit';

    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { enhance, applyAction } from '$app/forms';
    import { invalidateAll, goto } from '$app/navigation';
    import { siteConfig } from '$lib/config/site';
	import { Link } from '$lib/components/app/nav';
    import { FolderPlus, Folder, Pencil, Trash, X, Loader, Check } from '@repo/ui/icons';
    import { Button } from '@repo/ui/components/button';
    import { Separator } from '@repo/ui/components/separator';
    import { toast } from '@repo/ui/components/sonner';
    import { Input } from '@repo/ui/components/input';
    import * as AlertDialog from "@repo/ui/components/alert-dialog";
    import { cn } from '@repo/ui/utils';

    export let busy: boolean;
    export let savesData: TODO;

    let newGroupForm: HTMLFormElement | null;
	let newGroupInput: HTMLInputElement | null;
	let editGroupForm: HTMLFormElement | null;
	$: newGroupError = '';
	$: showNewGroupForm = false;
	$: editGroups = false;
	$: editGroupsErrors = [];

    

    onMount(async () => {
		newGroupInput = document.querySelector('#new-group-input');
		newGroupForm = document.querySelector('#new-group-form');
		newGroupInput?.addEventListener('focusout', (e: any) => {
			if (newGroupForm?.contains(e.relatedTarget)) return;
			showNewGroupForm = false;
			newGroupError = '';
			newGroupInput && (newGroupInput.value = '');
		});
	});

    const enhanceNewGroupForm: SubmitFunction = () => {	
		busy = true;
		return async ({ result }) => {
			if (result.type === 'success') {
				invalidateAll();
				await applyAction(result);
				newGroupInput && (newGroupInput.value = '');
				showNewGroupForm = false;
				toast.success('Successfully created group');
			} else {
				newGroupError = 'Invalid group name';
				newGroupInput?.focus();
				showNewGroupForm = true;
			}
			busy = false;
		};
	};
	const enhanceEditGroupForm: SubmitFunction = () => {
		busy = true;
		return async ({ result }) => {
			if (result.type === 'success') {
				invalidateAll();
				await applyAction(result);
				editGroups = false;
				editGroupsErrors = [];
				toast.success('Successfully updated groups');
			} else {
				editGroupsErrors = result.data.form.errors; // ??: why Property 'data' does not exist on type???
			}
			busy = false;
		};
	};
	const enhanceDeleteGroupForm: SubmitFunction = () => {
		busy = true;
		return async ({ result }) => {		
			if (result.type === 'success' || result.type === 'redirect') {
				invalidateAll();
				await applyAction(result);
				editGroups = false;
				editGroupsErrors = [];
				if (result.type === 'redirect') {
					goto(result.location);
				}
				toast.success('Successfully deleted group');
				busy = false;
				return
			} 
			toast.error('Something went wrong deleting the group');
			busy = false;
		};
	};
    function handleShowGroupForm() {
		showNewGroupForm = true;
		if (!newGroupInput) return;
		setTimeout(() => newGroupInput?.focus(), 0); // timeout needed to work
	}

</script>

<div class="px-5 pb-1 pt-5 flex items-center justify-between gap-2 w-full">
    <p class="px-3 font-bold">My groups</p>
    {#await $page.data.groups}
        {''}
    {:then items}
        {#if items.length !== 0}
            {#if editGroups}
                <div>
                    {#if !busy}
                        <Button variant="ghost" on:click={() => editGroups = false}>
                            <X class="h-4 w-4" />
                            <span class="sr-only">Cancel edit groups</span>
                        </Button>
                    {/if}
                    <Button variant="ghost" disabled={busy} on:click={() => editGroupForm?.requestSubmit()}>
                        {#if busy}
                            <Loader class="h-4 w-4 animate-spin" />
                            <span class="sr-only">Saving groups</span>
                        {:else}
                            <Check class="h-4 w-4" />
                            <span class="sr-only">Save groups</span>
                        {/if}
                    </Button>
                </div>
            {:else}
                <Button variant="ghost" on:click={() => editGroups = true}>
                    <Pencil class="h-4 w-4" />
                    <span class="sr-only">Edit groups</span>
                </Button>
            {/if}
        {/if}
    {/await}
</div>
<div class="w-full scroll-area px-5">
    <div class="flex w-full flex-col items-start">
        {#await $page.data.groups}
            <!-- {#each new Array(5) as _}
                <Skeleton class="mx-4 my-2 h-4 w-1/2" />
            {/each} -->
        {:then items}
            {#if items?.length > 0}
                {#if editGroups}
                    <form method="POST" bind:this={editGroupForm} class="w-full" action={siteConfig.appUrl + '/group/edit'} use:enhance={enhanceEditGroupForm}>
                        {#each items as { title, id }}
                            <div class="flex items-center ps-4 py-1">
                                <Folder class="me-2 h-4 w-4 shrink-0 animate-wiggle" />
                                <Input
                                    type="text"
                                    name={id}
                                    class="rounded-none px-0 border-t-0 border-x-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    value={title}
                                />
                                <AlertDialog.Root>
                                    <AlertDialog.Trigger asChild let:builder>
                                        <Button builders={[builder]} variant="ghost" class="ms-2 h-auto p-2">
                                            <Trash class="h-4 w-4" />
                                            <span class="sr-only">Delete group {title}</span>
                                        </Button>
                                    </AlertDialog.Trigger>
                                    <AlertDialog.Content>
                                        <AlertDialog.Header>
                                            <AlertDialog.Title>Do you really want to delete the group?</AlertDialog.Title>
                                            <AlertDialog.Description>The group "{title}" will be deleted and removed from all related stashes.</AlertDialog.Description>
                                        </AlertDialog.Header>
                                        <AlertDialog.Footer>
                                            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                                            <form method="POST" action={siteConfig.appUrl + '/group/delete'} use:enhance={enhanceDeleteGroupForm}>
                                                <input type="hidden" name="id" value={id}>
                                                <input type="hidden" name="isOnCurrentSlug" value={$page.params.slug ? true : false}>
                                                <button type="submit">
                                                    <AlertDialog.Action disabled={busy}>
                                                        {#if busy}<Loader class="h-4 w-4 animate-spin me-2" />{/if}
                                                        Delete group
                                                    </AlertDialog.Action>
                                                </button>
                                            </form>
                                        </AlertDialog.Footer>
                                        </AlertDialog.Content>
                                </AlertDialog.Root>
                            </div>
                            {#if editGroupsErrors[id]}
                                <p class="ps-8 text-sm text-destructive" aria-live="assertive">{editGroupsErrors[id][0]}</p>
                            {/if}
                        {/each}
                    </form>
                {:else}
                    {#each items as { title, id }}
                        <Link path={siteConfig.appUrl + '/group/' + id}>
                            <div class="flex items-center">
                                <Folder class="me-2 h-4 w-4" />
                                {title}
                            </div>
                            {#if savesData?.groupCounts && savesData.groupCounts[id]}
                                <div class="ms-auto">{savesData?.groupCounts[id]}</div>
                            <!-- {:else}
                                <div class="ms-auto"></div> -->
                            {/if}
                        </Link>
                    {/each}
                {/if}
            {/if}
        {:catch error}
            <p>Couldnt fetch groups!</p>
        {/await}
        <form
            method="POST"
            action={siteConfig.appUrl + '/group/new'}
            id="new-group-form"
            class={cn('w-full', showNewGroupForm ? 'block' : 'hidden')}
            use:enhance={enhanceNewGroupForm}
        >
            <div class="flex items-center ps-4 py-1">
                <Folder class="me-2 h-4 w-4 shrink-0" />
                <Input
                    id="new-group-input"
                    type="text"
                    name="title"
                    required
                    class="rounded-none px-0 border-t-0 border-x-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button type="submit" variant="ghost" class="ms-2 h-auto p-2" disabled={busy}>
                    {#if busy}
                        <Loader class="h-4 w-4 animate-spin" />
                        <span class="sr-only">Creating</span>
                    {:else}
                        <Check class="h-4 w-4" />
                        <span class="sr-only">Create</span>
                    {/if}
                </Button>
            </div>
            {#if newGroupError}
                <p class="ps-8 text-sm text-destructive" aria-live="assertive">{newGroupError}</p>
            {/if}
        </form>
    </div>
</div>
<div class="w-full pt-2 px-5">
    <Separator />
    <Button
        variant="nav"
        on:click={handleShowGroupForm}
        class="w-full justify-start "
    >
        <FolderPlus class="me-2 h-4 w-4" />New group
    </Button>
</div>