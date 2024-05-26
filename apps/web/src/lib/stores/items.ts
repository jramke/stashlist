import type { Save } from '$lib/types';

import { goto, invalidateAll, preloadData, pushState } from '$app/navigation';
import { siteConfig } from '$lib/config/site';
import { toast } from '@repo/ui/components/sonner';
import { get, writable, type Writable } from 'svelte/store';

const openContextMenus = writable<Writable<boolean>[]>([]);
const editDialogOpen = writable<boolean>(false);
const focusedItem = writable<HTMLElement | null>(null);
const editDialogCloseCallback = writable<Function | null>(null);
const deletedItems = writable<Set<string>>(new Set());

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

function softDelete(id: string, deleteFunction: () => Promise<boolean|Error>) {
    try {
        deletedItems.update((items) => items.add(id));
        
        const toastDismiss = async () => {
            if (!get(deletedItems).has(id)) return;

            const success = await deleteFunction();

            if (success === true) {
                await invalidateAll();
                deletedItems.update(set => {
                    set.delete(id);
                    return set;
                });
            }
        }
    
        toast('Successfully deleted stash', {
            action: {
                label: 'Undo',
                onClick: () => {
                    deletedItems.update(set => {
                        set.delete(id);
                        return set;
                    });
                }
            },
            onDismiss: toastDismiss,
            onAutoClose: toastDismiss,
        });

    } catch (error) {
        console.error('Error deleting stash', error);
        toast.error('Failed to delete stash');
        deletedItems.update(set => {
            set.delete(id);
            return set;
        });
    }
}

function deleteItem(id: Save['id']) {
    if (!id) return;
    softDelete(id, async () => {
        const response = await fetch('/api/saves/delete/' + id, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`Error deleting save. Status: ${response.status}`);
        }

        return true;
    });
}

export const itemsStore = {
    openContextMenus,
    editDialogOpen,
    deletedItems,
    focusedItem,
    createContextMenuOpenState,
    copyUrlToClipboard,
    openEditDialog,
    deleteItem,
    editDialogCloseCallback,
};