import { commandMenuOpen } from '$lib/stores';
import { getContext, setContext } from 'svelte';
import { writable, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { toast } from '@repo/ui/components/sonner';

let cmdPressed = writable(false);
let searchValue = writable('');

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
}
function resetPages() {
    commandPages.set([]);
    searchValue.set('');
}

function handleItemSelect(mainAction: string|Function, secondAction?: string|Function, closeMenu = true) {
    if (get(cmdPressed) && typeof secondAction !== 'undefined') {
        if (secondAction instanceof Function) {
            secondAction();
            return;
        }

        if (typeof secondAction === "string" && secondAction !== '') {
            navigator.clipboard.writeText(secondAction);
            toast.success('URL copied to clipboard');
            if (closeMenu) {
                commandMenuOpen.set(false);
                resetPages();
            }
            return;
        }
    }

    if (mainAction instanceof Function) {
        mainAction();
    }

    if (typeof mainAction === "string" && mainAction !== '') {
        let url = mainAction;
        goto(url);
    }

    if (closeMenu) {
        commandMenuOpen.set(false);
        resetPages();
    }
}

type CommandMenuContext = {
    handleItemSelect: typeof handleItemSelect;
    changePage: typeof changePage;
    cmdPressed: typeof cmdPressed;
    commandPages: typeof commandPages;
    searchValue: typeof searchValue;
}

export function setCommandMenuContext() {
    setContext('commandMenu', {
        handleItemSelect,
        changePage,
        cmdPressed,
        commandPages,
        searchValue,
    });
}

export function getCommandMenuContext() {
    return getContext<CommandMenuContext>('commandMenu');
}