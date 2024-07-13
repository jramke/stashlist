import type { SelectSave } from '$lib/server/db/schema';

import { goto, invalidateAll, preloadData, pushState } from '$app/navigation';
import { siteConfig } from '@repo/constants';
import { toast } from '@repo/ui/components/sonner';
import { get, writable, type Writable } from 'svelte/store';

const openContextMenus = writable<Writable<boolean>[]>([]);
const editDialogOpen = writable<boolean>(false);
const focusedItem = writable<HTMLElement | null>(null);
const editDialogCloseCallback = writable<Function | null>(null);
const deletedItems = writable<Set<string>>(new Set());
const fetchingMetadataItems = writable<Set<SelectSave['id']>>(new Set());

function createContextMenuOpenState(state: boolean) {
    const open = writable<boolean>(state);
    return open;
}

function getCopyData(item: SelectSave) {
    const copyUrlByType = {
        website: item.url,
        image: item.imageUrl,
        text: item.text,
        color: item.title,
    };
    const copyUrl = copyUrlByType[item.type] || item.url;
    return copyUrl;
}

function copyToClipboard(itemOrString: SelectSave | string, showToast = true) {
    let copyData;
    if (typeof itemOrString === 'string') {
        copyData = itemOrString;
    } else {
        copyData = getCopyData(itemOrString);  
    }
    navigator.clipboard.writeText(copyData);
    if (showToast) {
        toast.success('Copied to clipboard!');
    }
}

function getCopyText(type: SelectSave['type']) {
    const texts = {
        website: 'URL',
        image: 'image URL',
        text: 'text',
        color: 'color',
        default: 'URL',
    };
    return 'Copy ' + texts[type] || texts.default;
};

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

async function softDelete(id: string, deleteFunction: () => Promise<boolean|Error>) {
    try {
        deletedItems.update((items) => items.add(id));
        await invalidateAll();
        
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
                onClick: async () => {
                    deletedItems.update(set => {
                        set.delete(id);
                        return set;
                    });
                    await invalidateAll();
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

function deleteItem(id: SelectSave['id']) {
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

async function refetchMetadata(id: SelectSave['id']) {
    if (!id || get(fetchingMetadataItems).has(id)) return;
    
    fetchingMetadataItems.update((items) => items.add(id));
    
    try {
        const res = await fetch('/api/saves/metadata/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }),
        });

        if (!res.ok) {
            throw new Error('Failed to fetch metadata');
        }

        await invalidateAll();
        fetchingMetadataItems.update(set => {
            set.delete(id);
            return set;
        });

    } catch (error) {
        console.error('Error refetching metadata', error);
        toast.error('Failed to refetch metadata');
        fetchingMetadataItems.update(set => {
            set.delete(id);
            return set;
        });
    }
}

export const itemsStore = {
    openContextMenus,
    editDialogOpen,
    deletedItems,
    focusedItem,
    createContextMenuOpenState,
    copyToClipboard,
    getCopyText,
    getCopyData,
    openEditDialog,
    deleteItem,
    editDialogCloseCallback,
    refetchMetadata,
    fetchingMetadataItems,
};