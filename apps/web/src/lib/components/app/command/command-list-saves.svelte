<script lang="ts">
	import type { TODO } from "$lib/types";

    import * as Command from "@repo/ui/components/command";
	import { getCommandMenuContext } from "./context";
    import { Gradient } from "$lib/components/app";
	import { onMount } from "svelte";
	import { itemsStore } from "$lib/stores";
	import { ItemImage } from "$lib/components/app/saves";
	import { Type } from "@repo/ui/icons";
	import { cn } from "@repo/ui/utils";
	import type { SelectSave } from "$lib/server/db/schema";

    export let items: TODO;
    export let title = 'Stashes';

    const { handleItemSelect, closeMenu } = getCommandMenuContext();
    const { copyToClipboard, getCopyData } = itemsStore;

    const delimiter = '^$$^';
    let itemNodes: HTMLElement[] = [];
    
    const handleKeydown = (event: KeyboardEvent) => {
        const itemNode = itemNodes.find(node => node.getAttribute('data-selected'));
        
		if (!itemNode) return;
		
		if (event.key === 'c' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			copyToClipboard(itemNode.id.split(delimiter)[1]);
            closeMenu();
		}
	};
	
	onMount(() => {
        itemNodes = Array.from(document.querySelectorAll('[id^="command-stash-item"]'));
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		}
	});

    function mainActionByItemType(item: SelectSave) {
        if (item.type === 'website') {
            return () => window.open(item.url, '_blank');
        }
        if (item.type === 'image') {
            return () => window.open(item.imageUrl, '_blank');
        }
        if (item.type === 'text') {
            return () => copyToClipboard(item.text);
        }
        if (item.type === 'color') {
            return () => copyToClipboard(item.title);
        }
        return () => {};
    }

</script>

{#if items && items.length > 0}
    <Command.Group heading={title}>
        {#each items as item}
            <Command.Item onSelect={() => handleItemSelect(mainActionByItemType(item), item.id)} value={'item-' + item.id} id={'command-stash-item' + delimiter + getCopyData(item)}>
                {#if item.faviconUrl}
                    <img loading="lazy" class="size-4 shrink-0 me-2 rounded-[4px]" src={item.faviconUrl} alt={title} on:error={() => item.faviconUrl = ''} />
                {:else if item.type === 'color'}
                    <div class="size-4 shrink-0 me-2 rounded-[4px]" style={`background-color: ${item.title}`}></div>
                {:else if item.type === 'image'}
                    <div class="size-4 shrink-0 me-2 rounded-[4px] overflow-hidden relative">
                        <ItemImage imageUrl={item.imageUrl} title={item.title} gradientIndex={item.gradientIndex} absolute={true} />
                    </div>
                {:else if item.type === 'text'}
                    <div class={cn("size-4 shrink-0 me-2 rounded-[4px]", "flex items-center justify-center bg-white")}>
                        <Type class="!size-3.5 text-background" />
                    </div>
                {:else}
                    <div class="size-4 shrink-0 me-2 rounded-[4px] overflow-hidden relative">
                        <Gradient gradientIndex={item.gradientIndex} />
                    </div>
                {/if}
                <div class="flex items-baseline max-w-[95%] flex-grow">
                    <span class="truncate max-w-[80%] flex-shrink-0">
                        {item.title || item.text}
                    </span>
                    <!-- {#if item.description || item.text}
                        <span class="line-clamp-1 text-xs text-muted-foreground">
                            {item.description || item.text}
                        </span>
                    {/if} -->
                    {#if item.saveGroups.length !== 0}
                        <div class="ms-3 truncate text-xs text-muted-foreground">
                            {#each item.saveGroups as group, index}
                                {#if index < item.saveGroups.length - 1}
                                    {group.group.title + ', '}
                                {:else}
                                    {group.group.title}
                                {/if}
                            {/each}
                        </div>
                    {/if}
                </div>
            </Command.Item>
        {/each}
    </Command.Group>
{/if}