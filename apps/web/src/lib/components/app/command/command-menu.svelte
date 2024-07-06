<script lang="ts">
	import type { TODO } from "$lib/types";

	import { page } from "$app/stores";
	import { commandMenuOpen, liveView } from "$lib/stores";
    import * as Command from "@repo/ui/components/command";
    import { Separator } from "@repo/ui/components/separator";
	import { onMount } from "svelte";
	import { getCommandMenuContext, setCommandMenuContext } from "./context";
	import CommandListActions from "./command-list-actions.svelte";
	import CommandListGroups from "./command-list-groups.svelte";
    import CommandListSaves from "./command-list-saves.svelte";	
    import CommandListLayouts from "./command-list-layouts.svelte";
    import { Shortcut } from "@repo/ui/components/shortcut";
	import { goto } from "$app/navigation";
	import { siteConfig } from '@repo/constants';
	import { memoize } from "$lib/utils";
	import { get, writable } from "svelte/store";

    let groups: TODO;
    $: if (typeof $page.data.groups?.then === "function") {
        $page.data.groups.then(data => groups = data);
    } else {
        groups = $page.data.groups;
    }

    let saves: TODO;
    $: if (typeof $page.data.saves?.then === "function") {
        $page.data.saves.then(data => saves = data);
    } else {
        saves = $page.data.saves;
    }

    setCommandMenuContext();

    const { cmdPressed, commandPages, handleItemSelect, changePage, searchValue } = getCommandMenuContext();
    
    // let currentPage: string | undefined = undefined;
    let currentPage = $commandPages.length > 0 ? $commandPages[0] : undefined;

    $: currentPage = $commandPages[$commandPages.length - 1];

    // TODO: move this logic into a functuion because its also used in group/[slug]/page.ts
    $: currentGroup = groups?.filter((group: { id: string; }) => {
		return group.id === currentPage?.groupId;
	})[0];
    $: savesByGroup = saves?.items?.filter((save: { saveGroups: any; }) => {
        const groups = save.saveGroups;
        if (groups.length === 0) return;
        return groups.find((item: { group: { id: string; }; }) => item.group.id === currentPage?.groupId)
    });

    const searchableItems = writable(new Map());
    const searchableGroups = writable(new Map());

    saves.subscribe(($saves: any) => {
        const itemMap = new Map();
        if (!$saves) return;
        for (const item of $saves) {
            const itemSearch = (item.title + ' ' + item.description + ' ' + item.url).toLowerCase();
            itemMap.set(item.id, new Set(itemSearch.split(/\s+/)));
        }
        searchableItems.set(itemMap);
    });

    groups.subscribe(($groups: any) => {
        const groupMap = new Map();
        if (!$groups) return;
        for (const group of $groups) {
            const groupSearch = group.title.toLowerCase(); // Split by whitespace
            groupMap.set(group.id, new Set(groupSearch.split(/\s+/)));
        }
        searchableGroups.set(groupMap);
    });

    onMount(() => {
        function handleKeydown(e: KeyboardEvent) {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commandMenuOpen.set(!$commandMenuOpen);
                cmdPressed.set(false);
            }
            if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commandMenuOpen.set(false);
                goto(siteConfig.appUrl);
            }
            if (e.key === "u" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commandMenuOpen.set(false);
                goto(siteConfig.appUrl + '/unsorted');
            }
            if (e.key === "g" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commandMenuOpen.set(false);
                goto(siteConfig.appUrl + '/groups');
            }
            if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commandMenuOpen.set(false);
                liveView.update(state => !state);
            }
            if (e.key === "l" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commandMenuOpen.set(true);
                handleItemSelect(() => changePage({name: 'layouts'}), undefined, false);
            }
            if (e.metaKey || e.ctrlKey) {
                cmdPressed.set(true);
            }
        }
        function handleKeyup(e: KeyboardEvent) {
            if (e.key === 'Control' || e.key === 'Meta') {
                cmdPressed.set(false);
            }
        }

        document.addEventListener("keydown", handleKeydown);
        document.addEventListener("keyup", handleKeyup);
        
        return () => {
            document.removeEventListener("keydown", handleKeydown);
            document.removeEventListener("keyup", handleKeyup);
        };
    })

    const containsAllParts = (searchableSet: Set<string> | undefined, searchParts: string[]): boolean => {
        if (!searchableSet) return false;
        return searchParts.every(part => [...searchableSet].some(word => word.includes(part)));
    };

    const filter = memoize((value: string, search: string) => {
        const searchParts = search.toLowerCase().split(/\s+/); // Split by whitespace
        const itemsMap = get(searchableItems);
        const groupsMap = get(searchableGroups);

        if (value.startsWith('item-')) {
            const id = value.slice(5); // 'item-' has 5 characters
            const itemSearch = itemsMap.get(id);
            return itemSearch && containsAllParts(itemSearch, searchParts) ? 1 : 0;
        }

        if (value.startsWith('group-')) {
            const id = value.slice(6); // 'group-' has 6 characters
            const groupSearch = groupsMap.get(id);
            return groupSearch && containsAllParts(groupSearch, searchParts) ? 1 : 0;
        }
        
        const valueSearch = new Set(value.toLowerCase().split(/\s+/));
        return containsAllParts(valueSearch, searchParts) ? 1 : 0;
    });

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' || (e.key === 'Backspace' && !$searchValue)) {
			e.preventDefault();
            // dont close command dialog if going back from a page with escape key
            if ($commandPages.length > 0) { 
                e.stopPropagation();
            }
            commandPages.update(pages => {
                const newPages = pages.slice(0, -1);
                return newPages;
            });
		}
    }

</script>
   
<Command.Dialog bind:open={$commandMenuOpen} {filter} {onKeydown}>
    <Command.Input bind:value={$searchValue} placeholder="Type a command or search..." />
    <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        {#if savesByGroup?.length > 0}
            <CommandListSaves items={savesByGroup} title={currentGroup.title} />
        {:else if currentPage?.name === 'layouts'}
            <CommandListLayouts />
        {:else}
            <CommandListActions />
            <CommandListGroups {groups} />
            <CommandListSaves items={saves?.items} />
        {/if}
    </Command.List>
    <Command.Footer class="flex items-center justify-end">
        <div class="flex items-center gap-2">
            Copy url
            <Shortcut keys={['command', 'c']} />
        </div>
        <Separator orientation="vertical" />
        <div class="flex items-center gap-2">
            Search in group / detail view
            <Shortcut keys={['command', 'enter']} />
        </div>
        <Separator orientation="vertical" />
        <div class="flex items-center gap-2">
            Select / open item
            <Shortcut keys={['enter']} />
        </div>
    </Command.Footer>
</Command.Dialog>