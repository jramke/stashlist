import { getContext, setContext } from 'svelte';
import { writable, get } from 'svelte/store';
import { open } from '@tauri-apps/plugin-shell';
import { emit } from '@tauri-apps/api/event';

const focusableElSelctor = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

let parentEl = writable<HTMLElement|null>(null);
let cmdPressed = writable(false);
let searchValue = writable('');
let searchInput = writable<HTMLInputElement|null>(null);
let apiInput = writable<HTMLInputElement|null>(null);
let focusableEls = writable<HTMLElement[]>([]);

type CommandPage = {
    name: string;
    groupId?: string;
}
let commandPages = writable<CommandPage[]>([]);

function changePage(newPage: CommandPage) {
    commandPages.update(pages => {
        return [...pages, newPage];
    });
    searchValue.set('');
    // updateFocusableEls();
}

function resetPages() {
    commandPages.set([]);
    searchValue.set('');
    setTimeout(() => {
        updateFocusableEls();
        get(searchInput)?.focus();
    }, 100);
}

function goPageBack() {
    commandPages.update(pages => {
        const newPages = pages.slice(0, -1);
        return newPages;
    });
    setTimeout(() => {
        updateFocusableEls();
        get(searchInput)?.focus();
    }, 100);
}

function handleItemSelect(url: string) {
    open(url);
    closeApp();
}

function closeApp() {
    resetPages();
    emit('toggle-window-svelte', 'close');
}

function updateFocusableEls() {
    if (!get(parentEl)) {
        console.error('parentEl needs to be set before calling updateFocusableEls');
        return;
    }

    const isReallyFocusable = (el: HTMLElement|Element|null) => {
        if (!el) return false;
        return !el.hasAttribute('disabled') && !el.hasAttribute('aria-hidden') && !el.hasAttribute('hidden') && !el.classList.contains('hidden') && !el.classList.contains('disabled');
    };

    let items = Array.from(get(parentEl)!.querySelectorAll(focusableElSelctor));
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
    parentEl: typeof parentEl;
    focusableEls: typeof focusableEls;
    cmdPressed: typeof cmdPressed;
    commandPages: typeof commandPages;
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
        parentEl,
        focusableEls,
        cmdPressed,
        commandPages,
        searchValue,
        searchInput,
        apiInput,
    });
}

export function getCommandMenuContext() {
    return getContext<CommandMenuContext>('commandMenu');
}