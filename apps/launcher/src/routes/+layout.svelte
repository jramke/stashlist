<script lang="ts">
    import '@repo/ui/globals.pcss';
    import '../app.css';

    import { onMount } from 'svelte';
    import { getRecord, initStronghold } from '$lib/stronghold';
    import { apiKey, currentPage, groups, loading, saves } from '$lib/stores';
    import { listen } from '@tauri-apps/api/event';
    import { setCommandMenuContext, getCommandMenuContext } from "$lib/command/context";
    import { Toaster } from '@repo/ui/components/sonner';
    import { dev } from "$app/environment";
    import { fetch } from '@tauri-apps/plugin-http';
    
    type Payload =  'opened' | 'closed';

    setCommandMenuContext();
    const { focusableEls, searchInput, resetPages, searchValue, commandPages, goPageBack, closeApp, changePage, availablePages } = getCommandMenuContext();

    let removeTrapFocusListeners: (() => void) | undefined;
    $: if ($focusableEls) {
        removeTrapFocusListeners = trapFocus();
    }

    onMount(() => {
        removeTrapFocusListeners = trapFocus();
        const unlisten = listenForEvents();
        document.addEventListener('keydown', onKeydown);

        (async () => {
            await initStronghold();
            const apiKeyFromStronghold = await getRecord('api-key');
            apiKey.set(apiKeyFromStronghold);
    
            if (!$apiKey) {
                changePage(availablePages.connect);
            }

            getItems();
        })();

        return () => {
            removeTrapFocusListeners?.();
            unlisten.then(fn => fn());
            document.removeEventListener('keydown', onKeydown);
        }
    });

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' || (e.key === 'Backspace' && !$searchValue)) {
            console.log('back');
            
			e.preventDefault();
            if ($commandPages.length > 0) {
                goPageBack();
            } else {
                closeApp();
            }
		}
    }

    function trapFocus() {
        if (removeTrapFocusListeners) {
            removeTrapFocusListeners();
        } 

        if (!$focusableEls) return;

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
        document.addEventListener('keydown', handleTabKeyPress as EventListener);

        return () => {
            document.removeEventListener('keydown', handleTabKeyPress as EventListener);
        }
    }

    async function listenForEvents() {
        const unlisten = await listen<Payload>('toggle-window-rust', (event) => {
            if (event.payload === 'opened') {
                redirectToConnectPageIfNoApiKey();
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

    async function redirectToConnectPageIfNoApiKey() {
        if (!$apiKey && $currentPage !== availablePages.connect) {
            changePage(availablePages.connect);
        }
    }

    async function getItems() {
        loading.set(true);
        const getData = async (url: string) => {
            const response = await fetch(url, 
                { 
                    method: 'GET',
                    headers: {
                        'X-Api-Key': await getRecord('api-key'),
                    }
                }
            );

            if (!response.ok) {
                console.error(response.statusText, response);
                loading.set(false);
                return;
            }
            
            let result;
            
            if (dev) {
                result = await response.text();            
                result = JSON.parse(result);
            } else {
                result = await response.json();
            }
            
            return result;
        }

        let savesData: any;
        let groupsData: any;
        if (dev) {
            savesData = await getData('/saves.json');
            groupsData = await getData('/groups.json');
        } else {
            savesData = await getData('https://www.stashlist.app/api/saves');
            groupsData = await getData('https://www.stashlist.app/api/groups');
        } 

        saves.set(savesData?.saves);
        groups.set(groupsData);

        loading.set(false);
    }

</script>

<Toaster offset={16} duration={1300} position="bottom-center" />
<main>
    <slot />
</main>