import { goto, preloadData, pushState } from '$app/navigation';
import { siteConfig } from '$lib/config/site';
import { toast } from '@repo/ui/components/sonner';
import { writable, type Writable } from 'svelte/store';

const openContextMenus = writable<Writable<boolean>[]>([]);
const editDialogOpen = writable<boolean>(false);
const deleteDialogOpen = writable<boolean>(false);
const itemToDelete = writable<{id: string; title: string;} | null>(null);
const focusedItem = writable<HTMLElement | null>(null);
const editDialogCloseCallback = writable<Function | null>(null);

function createContextMenuOpenState(state: boolean) {
    const open = writable<boolean>(state);
    return open;
}

function copyUrlToClipboard(url: string) {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
}

async function openEditDialog(id: string | undefined) {
    if (!id) return;
    const href = siteConfig.appUrl + '/save/edit/' + id;
    const result = await preloadData(href);

    if (result.type === 'loaded' && result.status === 200) {
        pushState(href, {
            editStash: {
                form: result.data.form,
                save: result.data.save,
                groups: result.data.groups,
                isDialog: true,
            }
        });
        setTimeout(() => {
            editDialogOpen.set(true);
        }, 100);
    } else {
        goto(href);
    }

}

function openDeleteDialog(id: string | undefined, title: string) {
    if (!id) return;
    itemToDelete.set({id, title});
    deleteDialogOpen.set(true);
}

export const itemsStore = {
    openContextMenus,
    editDialogOpen,
    deleteDialogOpen,
    itemToDelete,
    focusedItem,
    createContextMenuOpenState,
    copyUrlToClipboard,
    openEditDialog,
    openDeleteDialog,
    editDialogCloseCallback,
};