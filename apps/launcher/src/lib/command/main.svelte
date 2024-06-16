<script lang="ts">
    import * as Command from "@repo/ui/components/command";
    import { Separator } from "@repo/ui/components/separator";
    import { Shortcut } from "@repo/ui/components/shortcut";
    import { Stash } from "@repo/ui/icons";
	import { onMount } from "svelte";
    import { listen } from '@tauri-apps/api/event'
    import { getCommandMenuContext, setCommandMenuContext } from "./context";
    import Connect from "./connect.svelte";
    import { getRecord } from "$lib/stronghold";
    import { fetch } from '@tauri-apps/plugin-http';

    type Payload =  'opened' | 'closed';

    setCommandMenuContext();
    const { cmdPressed, commandPages, handleItemSelect, changePage, searchValue, searchInput, apiInput, goPageBack, closeApp, focusableEls, parentEl, updateFocusableEls, resetPages } = getCommandMenuContext();

    let currentPage = $commandPages.length > 0 ? $commandPages[0] : undefined;
    $: currentPage = $commandPages[$commandPages.length - 1];

    let removeTrapFocusListeners: (() => void) | undefined;
    $: if ($focusableEls) {
        removeTrapFocusListeners = trapFocus();
    }

    let loading = true;
	let saves: any[] = [];
    let groups: any[] = [];

    onMount(() => {
        console.log('command menu mount');
        getItems();
        

        parentEl.set(document.querySelector('[data-cmdk-root]') as HTMLElement);
        searchInput.set(document.querySelector('[data-cmdk-input]') as HTMLInputElement); // bind:el not working?
        updateFocusableEls();
        
        removeTrapFocusListeners = trapFocus();
        const unlisten = listenForEvents();

        document.addEventListener("keydown", handleKeydown);
        document.addEventListener("keyup", handleKeyup);
        
        return () => {
            document.removeEventListener("keydown", handleKeydown);
            document.removeEventListener("keyup", handleKeyup);
            unlisten.then(fn => fn());
            removeTrapFocusListeners?.();
        };
    });

    function filter(value: string, search: string) {
        if (value.includes(search)) return 1;
        return 0;
    }

    function onKeydown(e: KeyboardEvent) {
        // if ($commandMenuOpen) {
        //     // e.preventDefault();
        //     e.stopPropagation(); 
        // }
        
        if (e.key === 'Escape' || (e.key === 'Backspace' && !$searchValue && document.activeElement !== $apiInput)) {
			e.preventDefault();
            // dont close command dialog if going back from a page with escape key
            if ($commandPages.length > 0) { 
                e.stopPropagation();
                goPageBack();
            } else {
                closeApp();
            }
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

    async function listenForEvents() {
        const unlisten = await listen<Payload>('toggle-window-rust', (event) => {
            console.log(event.payload);
            if (event.payload === 'opened') {
                $searchInput?.focus();
            }
            if (event.payload === 'closed') {
                // Timeout so the page doesnt change while window closing animation
                setTimeout(() => {
                    resetPages();
                }, 200);
            }
        });
        return unlisten;
    }

    function trapFocus() {
        if (removeTrapFocusListeners) {
            removeTrapFocusListeners();
        }

        if (!$focusableEls || !$parentEl) return;

        const firstFocusableEl = $focusableEls?.[0] as HTMLElement;
        const lastFocusableEl = $focusableEls?.[$focusableEls.length - 1] as HTMLElement;

        const handleTabKeyPress = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            if (event.shiftKey) {
                if (document.activeElement === firstFocusableEl) {
                    event.preventDefault();
                    lastFocusableEl.focus();
                }
            } else {
                if (document.activeElement === lastFocusableEl) {
                    event.preventDefault();
                    firstFocusableEl.focus();
                }
            }
        }
        $parentEl?.addEventListener('keydown', handleTabKeyPress as EventListener);

        return () => {
            $parentEl?.removeEventListener('keydown', handleTabKeyPress as EventListener);
        }
    }

    

</script>
   
<Command.Root {filter} {onKeydown}>
    <div class:hidden={currentPage?.name === 'connect'}>
        <Command.Input class={currentPage?.name === 'connect' ? 'hidden' : ''} bind:value={$searchValue}  placeholder="Search your stashes..." />
    </div>
    <Command.List>
        {#if currentPage?.name !== 'connect'}
            <Command.Empty>No results found.</Command.Empty>
        {/if}
        {#if currentPage?.name === 'connect'}
            <Connect />
        {:else}
            <Command.Group heading="Actions">
                <Command.Item onSelect={() => changePage({name: 'connect'})} value="Connect to Stashlist">
                    <Stash class="me-2 shrink-0" />
                    Connect to Stashlist
                </Command.Item>
                <Command.Item onSelect={() => handleItemSelect('https://stashlist.app')} value="Open Stashlist">
                    <Stash class="me-2 shrink-0" />
                    Open Stashlist
                </Command.Item>
            </Command.Group>
        {/if}
        {#if loading}
            <Command.Loading>Fetching stashes</Command.Loading>
		{:else}
            {#if groups?.length > 0}
                <Command.Group heading="Groups">
                    {#each groups as { title }}
                        <Command.Item value={title}>
                            {title}
                        </Command.Item>
                    {/each}
                </Command.Group>
            {/if}
            {#if saves?.length > 0}
                <Command.Group heading="Stashes">
                    {#each saves as { title, description, url }}
                        <Command.Item value={title + ' ' + description} onSelect={() => handleItemSelect(url)}>
                            {title}
                        </Command.Item>
                    {/each}
                </Command.Group>
            {/if}
		{/if}
    </Command.List>
    <Command.Footer class="flex items-center justify-end mt-auto">
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