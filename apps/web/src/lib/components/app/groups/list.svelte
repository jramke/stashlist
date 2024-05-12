<script lang="ts">
	import { page } from '$app/stores';
    import { EmptyState } from '$lib/components/app';
    import { gridArrowKeys } from '$lib/actions';
	import { listColumns, newGroupDialogOpen } from '$lib/stores';
	import { Button } from '@repo/ui/components/button';
	import { Skeleton } from '@repo/ui/components/skeleton';
    import GroupItem from './item.svelte';

    let groups: any;
    $: if ($page.data.groups) {
        groups = getGroups();
    }

    async function getGroups() {
		const groups = (await $page.data.groups) || [];
		if (!groups || groups.length === 0) return [];
		return groups;
	}
    
</script>

{#await groups}
	<div class="grid grid-cols-{$listColumns} gap-6 self-start">
		{#each new Array(9) as _}
			<Skeleton class="aspect-video" />
		{/each}
	</div>
{:then items}
    {#if items.length > 0}
        <div class="grid grid-cols-{$listColumns} gap-20" use:gridArrowKeys={{ selector: '.group-list__item__image-wrapper' }}>
            {#each items as {id, title, gradientIndex, saves}}
                <GroupItem {id} {title} {gradientIndex} {saves} />
            {/each}
        </div>
    {:else}
        <EmptyState title="No groups found" message="Your stashes are very messy. Clean them up and create your first group">
            <Button variant="outline" on:click={() => newGroupDialogOpen.set(true)}>Create group</Button>
        </EmptyState>
    {/if}
{:catch error}
	<p>Couldnt fetch groups!</p>
{/await}

