import { getContext, setContext } from 'svelte';
import type { CommandPage } from '$lib/types';
import { writable, get } from 'svelte/store';
import { open } from '@tauri-apps/plugin-shell';
import { emit } from '@tauri-apps/api/event';
import { getCurrent, LogicalSize } from '@tauri-apps/api/window';
import { currentPage } from '$lib/stores';

const focusableElSelctor = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

let cmdPressed = writable(false);
let searchValue = writable('');
let searchInput = writable<HTMLInputElement|null>(null);
let apiInput = writable<HTMLInputElement|null>(null);
let focusableEls = writable<HTMLElement[]>([]);

const defaultSize = new LogicalSize(600, 444);

let commandPages = writable<CommandPage[]>([]);

function getCurrentPage(pages = get(commandPages)) {
    if (pages.length > 0) {
        return pages[pages.length - 1];
    } else {
        return undefined;
    }
}

function changePage(newPage: CommandPage) {
    commandPages.update(pages => {
        return [...pages, newPage];
    });
    searchValue.set('');
    setTimeout(async () => {
        if (newPage.height) {
            // 600 is default width, specified in tauri conf
            await getCurrent().setSize(new LogicalSize(600, newPage.height));
        }
        updateFocusableEls();
        get(searchInput)?.focus();
    }, 10);
}

function resetPages() {
    commandPages.set([]);
    searchValue.set('');
    setTimeout(async () => {
        await getCurrent().setSize(defaultSize);
        updateFocusableEls();
        get(searchInput)?.focus();
    }, 10);
}

async function goPageBack() {
    const currentPageHeight = getCurrentPage(get(commandPages).slice(0, -1))?.height;
    console.log('updated commandPages', get(commandPages), get(currentPage), getCurrentPage(get(commandPages).slice(0, -1)));
    if (!currentPageHeight) {
        await getCurrent().setSize(defaultSize);
    } else {
        await getCurrent().setSize(new LogicalSize(600, currentPageHeight));
    }
    commandPages.update(pages => {
        const newPages = pages.slice(0, -1);
        return newPages;
    });
    setTimeout(async () => {
        updateFocusableEls();
        get(searchInput)?.focus();
    }, 10);
}

function handleItemSelect(mainAction: string|Function, secondAction?: string|Function, closeAfterAction = true) {
    console.log('handleItemSelect', mainAction, secondAction, closeAfterAction);
    
    if (get(cmdPressed) && typeof secondAction !== 'undefined') {
        if (secondAction instanceof Function) {
            secondAction();
            return;
        }

        if (typeof secondAction === "string" && secondAction !== '') {
            // openEditDialog(secondAction);
            // editDialogCloseCallback.set(() => {
            //     commandMenuOpen.set(true);
            // });
            // TODO: redirect to stashlist with edit dialog
            if (closeAfterAction) {
                closeApp();
            }
            return;
        }
    }

    if (mainAction instanceof Function) {
        mainAction();
    }

    if (typeof mainAction === "string" && mainAction !== '') {
        let url = mainAction;
        open(url);
    }

    if (closeAfterAction) {
        closeApp();
    }
}

function closeApp() {
    resetPages();
    emit('toggle-window-svelte', 'close');
}

function updateFocusableEls() {
    const main = document.querySelector('main');
    if (!main) {
        console.error('main element not found');
        return;
    }

    const isReallyFocusable = (el: HTMLElement|Element|null) => {
        if (!el) return false;
        return !el.hasAttribute('disabled') && !el.hasAttribute('aria-hidden') && !el.hasAttribute('hidden') && !el.classList.contains('hidden') && !el.classList.contains('disabled');
    };

    let items = Array.from(main.querySelectorAll(focusableElSelctor));
    items = items.filter((el) => isReallyFocusable(el) && isReallyFocusable(el.parentElement));    
    
    focusableEls.set(items as HTMLElement[]);
}

type CommandMenuContext = {
    resetPages: typeof resetPages;
    goPageBack: typeof goPageBack;
    changePage: typeof changePage;
    handleItemSelect: typeof handleItemSelect;
    closeApp: typeof closeApp;
    updateFocusableEls: typeof updateFocusableEls;
    getCurrentPage: typeof getCurrentPage;
    focusableEls: typeof focusableEls;
    cmdPressed: typeof cmdPressed;
    commandPages: typeof commandPages;
    currentPage: typeof currentPage;
    searchValue: typeof searchValue;
    searchInput: typeof searchInput;
    apiInput: typeof apiInput;
}

export function setCommandMenuContext() {
    setContext('commandMenu', {
        resetPages,
        goPageBack,
        changePage,
        handleItemSelect,
        closeApp,
        updateFocusableEls,
        getCurrentPage,
        focusableEls,
        cmdPressed,
        commandPages,
        currentPage,
        searchValue,
        searchInput,
        apiInput,
    });
}

export function getCommandMenuContext() {
    return getContext<CommandMenuContext>('commandMenu');
}