<script lang="ts">
    import '@repo/ui/globals.pcss';
    import '../app.pcss';

    import { onMount } from 'svelte';
    import { getRecord, initStronghold } from '$lib/stronghold';
    import { apiKey } from '$lib/stores';
    import { listen } from '@tauri-apps/api/event';
    import { afterNavigate, goto } from '$app/navigation';
    import { setCommandMenuContext, getCommandMenuContext } from "$lib/command/context";
    import { page } from '$app/stores';
    import { Toaster } from '@repo/ui/components/sonner';
    
    type Payload =  'opened' | 'closed';

    setCommandMenuContext();
    const { focusableEls, searchInput, resetPages, searchValue, apiInput, commandPages, goPageBack, closeApp, updateFocusableEls } = getCommandMenuContext();

    let removeTrapFocusListeners: (() => void) | undefined;
    $: if ($focusableEls) {
        removeTrapFocusListeners = trapFocus();
    }

    afterNavigate(() => {
        updateFocusableEls();
    });

    onMount(() => {
        removeTrapFocusListeners = trapFocus();
        const unlisten = listenForEvents();
        document.addEventListener('keydown', onKeydown);

        (async () => {
            await initStronghold();
            const apiKeyFromStronghold = await getRecord('api-key');
            apiKey.set(apiKeyFromStronghold);
    
            if (!$apiKey) {
                goto('/connect');
            }
        })();

        return () => {
            removeTrapFocusListeners?.();
            unlisten.then(fn => fn());
            document.removeEventListener('keydown', onKeydown);
        }
    });

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' || (e.key === 'Backspace' && !$searchValue && document.activeElement !== $apiInput)) {
			e.preventDefault();
            if ($commandPages.length > 0) {
                // e.stopPropagation();
                goPageBack();
            } else if ($page.route.id === '/connect') {
                goto('/');
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
        if (!$apiKey && $page.route.id !== '/connect') {
            goto('/connect');
        }
    }

</script>

<Toaster offset="0px" duration={1300} position="bottom-center" />
<main>
    <slot />
</main>