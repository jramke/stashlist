<script lang="ts">
	import type { TODO } from "$lib/types";

    import * as Command from "@repo/ui/components/command";
	import { getCommandMenuContext } from "./context";
    import { Gradient } from "$lib/components/app";
	import { onMount } from "svelte";
	import { itemsStore } from "$lib/stores";

    export let items: TODO;
    export let title = 'Stashes';

    const { handleItemSelect, closeMenu } = getCommandMenuContext();
    const { copyUrlToClipboard } = itemsStore;

    const delimiter = '^$$^';
    let itemNodes: HTMLElement[] = [];
    
    const handleKeydown = (event: KeyboardEvent) => {
        const itemNode = itemNodes.find(node => node.getAttribute('data-selected'));
        
		if (!itemNode) return;
		
		if (event.key === 'c' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			copyUrlToClipboard(itemNode.id.split(delimiter)[1]);
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

</script>

{#if items && items.length > 0}
    <Command.Group heading={title}>
        {#each items as { id, title, description, url, faviconUrl, gradientIndex, saveGroups}, index}
            <Command.Item onSelect={() => handleItemSelect(() => window.open(url, '_blank'), id)} value={'item-' + id} id={'command-stash-item' + delimiter + url}>
                {#if faviconUrl}
                    <img loading="lazy" class="size-4 shrink-0 me-2" src={faviconUrl} alt={title} on:error={() => faviconUrl = ''} />
                {:else}
                    <div class="rounded-full size-4 shrink-0 me-2 overflow-hidden relative">
                        <Gradient {gradientIndex} />
                    </div>
                {/if}
                <div class="flex items-baseline max-w-[95%] flex-grow">
                    <span class="truncate max-w-[80%]">
                        {title}
                    </span>
                    {#if saveGroups.length !== 0}
                        <div class="ms-3 truncate text-xs text-muted-foreground">
                            {#each saveGroups as group, index}
                                {#if index < saveGroups.length - 1}
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