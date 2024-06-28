<script lang="ts">
    import * as Command from "@repo/ui/components/command";
    import { Separator } from "@repo/ui/components/separator";
    import { Shortcut } from "@repo/ui/components/shortcut";
    import { Stash, Unplug } from "@repo/ui/icons";
	import { onMount } from "svelte";
    import { getCommandMenuContext } from "./context";
    import { apiKey, groups, loading, saves } from "$lib/stores";
    import CommandListSaves from "./command-list-saves.svelte";
    import CommandListGroups from "./command-list-groups.svelte";
    import { pageComponents } from "./pages";
    import { currentPage } from "$lib/stores";
    import { siteConfig } from "@repo/constants";
    import { Badge } from "@repo/ui/components/badge";
    import { get, writable } from "svelte/store";

    const { cmdPressed, commandPages, handleItemSelect, searchValue, searchInput, changePage, getCurrentPage, availablePages } = getCommandMenuContext();

    $: if ($commandPages) {
        currentPage.set(getCurrentPage());
    }

    // TODO: move this logic into a functuion because its also used in group/[slug]/page.ts
    $: currentGroup = $groups?.filter((group: { id: string; }) => {
		return group.id === $currentPage?.groupId;
	})[0];
    $: savesByGroup = $saves?.filter((save: { saveGroups: any; }) => {
        const groups = save.saveGroups;
        if (groups.length === 0) return;
        return groups.find((item: { group: { id: string; }; }) => item.group.id === $currentPage?.groupId)
    });

    const searchableItems = writable(new Map());
    const searchableGroups = writable(new Map());

    saves.subscribe(($saves) => {
        const itemMap = new Map();
        for (const item of $saves) {
            const itemSearch = (item.title + ' ' + item.description + ' ' + item.url).toLowerCase();
            itemMap.set(item.id, itemSearch);
        }
        searchableItems.set(itemMap);
    });

    groups.subscribe(($groups) => {
        const groupMap = new Map();
        for (const group of $groups) {
            groupMap.set(group.id, group.title.toLowerCase());
        }
        searchableGroups.set(groupMap);
    });

    onMount(() => {
        searchInput.set(document.querySelector('[data-cmdk-input]') as HTMLInputElement); // bind:el not working?
        $searchInput?.focus();
        
        document.addEventListener("keyup", handleKeyup);
        
        return () => {
            document.removeEventListener("keyup", handleKeyup);
        };
    });

    function filter(value: string, search: string) {
        if ($currentPage?.preventFilter) return 1;

        search = search.toLowerCase();
        const itemsMap = get(searchableItems);
        const groupsMap = get(searchableGroups);

        if (value.startsWith('item-')) {
            const id = value.slice(5); // 'item-' has 5 characters
            const itemSearch = itemsMap.get(id);
            return itemSearch && itemSearch.includes(search) ? 1 : 0;
        }

        if (value.startsWith('group-')) {
            const id = value.slice(6); // 'group-' has 6 characters
            const groupSearch = groupsMap.get(id);
            return groupSearch && groupSearch.includes(search) ? 1 : 0;
        }
        
        return value.toLowerCase().includes(search) ? 1 : 0;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.metaKey || e.ctrlKey) {
            cmdPressed.set(true);
        }
    }

    function handleKeyup(e: KeyboardEvent) {
        if (e.key === 'Control' || e.key === 'Meta') {
            cmdPressed.set(false);
        }
    }

</script>
   
<Command.Root {filter} {onKeydown}>
    <Command.Breadcrumbs pages={['Stashlist', ...$commandPages.map(page => page.name)]} />
    <Command.Input bind:value={$searchValue} icon={null} placeholder={$currentPage?.placeholder ?? "Search your stashes..."} />
    <Command.List>
        {#if !$currentPage?.preventFilter}
            <Command.Empty>No results found.</Command.Empty>
        {/if}
        {#if $currentPage}
            {#if pageComponents[$currentPage.id]}
                <div class="text-sm">
                    <svelte:component this={pageComponents[$currentPage.id]} />
                </div>
            {:else if savesByGroup?.length > 0}
                <CommandListSaves items={savesByGroup} title={currentGroup.title} />
            {/if}
        {:else}
            <Command.Group heading="Actions">
                <Command.Item onSelect={() => handleItemSelect(siteConfig.url)} value="Open Stashlist">
                    <Stash class="me-2 shrink-0" />
                    Open Stashlist
                </Command.Item>
                <Command.Item onSelect={() => changePage(availablePages.connect)} value="Connect your stashes">
                    <Unplug class="me-2 shrink-0" />
                    Connect your stashes
                    {#if $apiKey}
                        <Badge class="ml-auto">Connected</Badge>
                    {/if}
                </Command.Item>
            </Command.Group>
            {#if $apiKey}
                {#if $loading}
                    <Command.Loading>Fetching stashes</Command.Loading>
                {:else}
                    <CommandListGroups groups={$groups} />
                    <CommandListSaves items={$saves} />
                {/if}
            {/if}
        {/if}
    </Command.List>
    {#if !$currentPage?.hideFooter}
        <Command.Footer class="flex items-center justify-end mt-auto">
            <div class="flex items-center gap-2">
                Copy url
                <Shortcut keys={['command', 'C']} />
            </div>
            <Separator orientation="vertical" />
            <div class="flex items-center gap-2">
                Search in group / detail view
                <Shortcut keys={['command', 'enter']} />
            </div>
            <Separator orientation="vertical" />
            <div class="flex items-center gap-2">
                Open item
                <Shortcut keys={['enter']} />
            </div>
        </Command.Footer>
    {/if}
</Command.Root>