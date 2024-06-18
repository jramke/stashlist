<script lang="ts">
    import * as Command from "@repo/ui/components/command";
    import { Separator } from "@repo/ui/components/separator";
    import { Shortcut } from "@repo/ui/components/shortcut";
    import { Stash, Unplug } from "@repo/ui/icons";
	import { onMount } from "svelte";
    import { getCommandMenuContext } from "./context";
    import { getRecord } from "$lib/stronghold";
    import { fetch } from '@tauri-apps/plugin-http';
    import { apiKey } from "$lib/stores";
    import { goto } from "$app/navigation";

    const { cmdPressed, commandPages, handleItemSelect, searchValue, searchInput } = getCommandMenuContext();

    let currentPage = $commandPages.length > 0 ? $commandPages[0] : undefined;
    $: currentPage = $commandPages[$commandPages.length - 1];

    let loading = true;
	let saves: any[] = [];
    let groups: any[] = [];

    onMount(() => {
        console.log('command menu mount');
        getItems(); // TODO: cache this or make it a store?

        // parentEl.set(document.querySelector('[data-cmdk-root]') as HTMLElement);
        searchInput.set(document.querySelector('[data-cmdk-input]') as HTMLInputElement); // bind:el not working?
        $searchInput?.focus();
        
        document.addEventListener("keyup", handleKeyup);
        
        return () => {
            document.removeEventListener("keyup", handleKeyup);
        };
    });

    function filter(value: string, search: string) {
        if (value.includes(search)) return 1;
        return 0;
    }

    function onKeydown(e: KeyboardEvent) {
        console.log(e);
        
        if (e.metaKey || e.ctrlKey) {
            cmdPressed.set(true);
        }
    }

    function handleKeyup(e: KeyboardEvent) {
        if (e.key === 'Control' || e.key === 'Meta') {
            cmdPressed.set(false);
        }
    }

    async function getItems() {
        loading = true;

        const getData = async (url: string) => {
            const response = await fetch(url, 
                { 
                    method: 'GET',
                    headers: {
                        'X-Api-Key': await getRecord('api-key'),
                    }
                }
            );
            
            // const result = await response.json();
            // return result;
            
            const result = await response.text();            
            return JSON.parse(result);
        }
        const savesData = await getData('/saves.json');
        const groupsData = await getData('/groups.json');
        // const savesData = await getData('https://www.stashlist.app/api/saves');
        // const groupsData = await getData('https://www.stashlist.app/api/groups');
        // const savesData = await getData('http://127.0.0.1:5173/api/saves');
        // const groupsData = await getData('http://127.0.0.1:5173/api/groups');

        console.log(savesData);
        console.log(groupsData);

        saves = savesData.saves;
        groups = groupsData;

        loading = false;
    }

</script>
   
<Command.Root {filter} {onKeydown}>
    <Command.Input  bind:value={$searchValue}  placeholder="Search your stashes..." />
    <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Actions">
            <Command.Item onSelect={() => goto('/connect')} value="Connect your Stashlist">
                <Unplug class="me-2 shrink-0" />
                Connect your Stashlist
            </Command.Item>
            <Command.Item onSelect={() => handleItemSelect('https://stashlist.app')} value="Open Stashlist">
                <Stash class="me-2 shrink-0" />
                Open Stashlist
            </Command.Item>
        </Command.Group>
        {#if $apiKey}
            {#if loading}
                <Command.Loading>Fetching stashes</Command.Loading>
            {:else}
                {#if groups?.length > 0}
                    <Command.Group heading="Groups">
                        {#each groups as { title, id }}
                            <Command.Item value={title} onSelect={() => handleItemSelect('https://stashlist.app/main/group/' + id)}>
                                {title}
                            </Command.Item>
                        {/each}
                    </Command.Group>
                {/if}
                {#if saves?.length > 0}
                    <Command.Group heading="Stashes">
                        {#each saves as { title, description, url }}
                            <Command.Item value={title + ' ' + description + ' ' + url} onSelect={() => handleItemSelect(url)}>
                                {title}
                            </Command.Item>
                        {/each}
                    </Command.Group>
                {/if}
            {/if}
        {/if}
    </Command.List>
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
            Select / open item
            <Shortcut keys={['enter']} />
        </div>
    </Command.Footer>
</Command.Root>