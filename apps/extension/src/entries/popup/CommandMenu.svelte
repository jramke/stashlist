<script lang="ts">
    import browser from 'webextension-polyfill';
    import { writable } from "svelte/store";
    import * as Command from "@repo/ui/components/command";
    import { Separator } from "@repo/ui/components/separator";
    import { Shortcut } from "@repo/ui/components/shortcut";
	import { onMount } from "svelte";

    const cmdPressed = writable(false);
    const searchValue = writable('');

    let searchInput: HTMLInputElement;

    type CommandPage = {
        name: string;
        groupId?: string;
    }
    const commandPages = writable<CommandPage[]>([]);

    let loading = true;
	let saves: any[] = [];
    let groups: any[] = [];

    onMount(() => {
        console.log('command menu mount');
        getItems();

        searchInput = document.querySelector('[data-cmdk-input]') as HTMLInputElement; // bind:el not working?
        searchInput?.focus();
        
        document.addEventListener("keydown", handleKeydown);
        document.addEventListener("keyup", handleKeyup);
        
        return () => {
            document.removeEventListener("keydown", handleKeydown);
            document.removeEventListener("keyup", handleKeyup);
        };
    });

    // browser.runtime.onMessage.addListener(async (message: any) => {
    //     if (message.toggleCommandMenu) {
    //         commandMenuOpen.set(!$commandMenuOpen);
    //         if ($commandMenuOpen === true) {
    //             loading = true;
    //         } else {
    //             loading = false;
    //         }
    //     }
    //     if (message.saves) {
    //         items = message.saves;
    //         loading = false;
    //     }
    // });

    function filter(value: string, search: string) {
        if (value.includes(search)) return 1;
        return 0;
    }

    function onKeydown(e: KeyboardEvent) {
        console.log(e);
        // if ($commandMenuOpen) {
        //     // e.preventDefault();
        //     e.stopPropagation(); 
        // }
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

    function handleKeydown(e: KeyboardEvent) {
        // if (e.key === "Escape" && $commandMenuOpen) {
        //     e.preventDefault();
        //     commandMenuOpen.set(false);
        // }
        // if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        //     e.preventDefault();
        //     commandMenuOpen.set(!$commandMenuOpen);
        //     cmdPressed.set(false);
        // }
        // if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        //     e.preventDefault();
        //     commandMenuOpen.set(false);
        //     goto(siteConfig.appUrl);
        // }
        // if (e.key === "u" && (e.metaKey || e.ctrlKey)) {
        //     e.preventDefault();
        //     commandMenuOpen.set(false);
        //     goto(siteConfig.appUrl + '/unsorted');
        // }
        // if (e.key === "g" && (e.metaKey || e.ctrlKey)) {
        //     e.preventDefault();
        //     commandMenuOpen.set(false);
        //     goto(siteConfig.appUrl + '/groups');
        // }
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
            const response = await fetch(url);
            const result = await response.json();
            return result;
        }
        const savesData = await getData('http://127.0.0.1:5173/api/saves');
        const groupsData = await getData('http://127.0.0.1:5173/api/groups');

        saves = savesData.saves;
        groups = groupsData;

        loading = false;
    }

</script>
   
<Command.Root {filter} {onKeydown}>
    <Command.Input bind:value={$searchValue} placeholder="Search your stashes..." />
    <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        {#if loading}
            <Command.Loading>Fetching stashes</Command.Loading>
		{:else}
            {#if groups.length > 0}
                <Command.Group heading="Groups">
                    {#each groups as { title }}
                        <Command.Item value={title}>
                            {title}
                        </Command.Item>
                    {/each}
                </Command.Group>
            {/if}
            {#if saves.length > 0}
                <Command.Group heading="Stashes">
                    {#each saves as { title, description, url }}
                        <Command.Item value={title + ' ' + description} onSelect={() => window.open(url, '_blank')?.focus()}>
                            {title}
                        </Command.Item>
                    {/each}
                </Command.Group>
            {/if}
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
</Command.Root>