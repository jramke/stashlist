<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { siteConfig } from "$lib/config/site";
	import { commandMenuOpen, editGroupsDialogOpen, newGroupDialogOpen } from "$lib/stores";
    import * as Command from "@repo/ui/components/command";
	import { onMount } from "svelte";
	import Gradient from "./gradient.svelte";

    let groups: TODO;
    $: $page.data.groups.then(data => groups = data);

    onMount(() => {
        function handleKeydown(e: KeyboardEvent) {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commandMenuOpen.set(!$commandMenuOpen);
            }
        }

        document.addEventListener("keydown", handleKeydown);

        return () => {
            document.removeEventListener("keydown", handleKeydown);
        };
    })

    const handleItemSelect = (data: string|Function) => {        
        if (data instanceof Function) {
            data();
        }
        if (typeof data === "string") {
            let url = data as string;
            goto(url);
        }
        commandMenuOpen.set(false);
    }

    const filter = (value: string, search: string) => {
        if (value.includes(search)) return 1;
        return 0;
    }

</script>
   
<Command.Dialog bind:open={$commandMenuOpen} {filter}>
    <Command.Input placeholder="Type a command or search..." />
    <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Views">
            <Command.Item onSelect={() => handleItemSelect(siteConfig.appUrl)}>All stashes</Command.Item>
            <Command.Item onSelect={() => handleItemSelect(siteConfig.appUrl + '/unsorted')}>Unsorted</Command.Item>
        </Command.Group>
        <Command.Group heading="Commands">
            <Command.Item onSelect={() => handleItemSelect(() => newGroupDialogOpen.set(true))}>New Group</Command.Item>
            <Command.Item onSelect={() => handleItemSelect(() => editGroupsDialogOpen.set(true))}>Edit Groups</Command.Item>
        </Command.Group>
        {#if groups && groups.length > 0}    
            <Command.Group heading="Groups">
                {#each groups as group}
                    <Command.Item onSelect={() => handleItemSelect(siteConfig.appUrl + '/group/' + group.id)}>
                        <div class="rounded-full size-4 overflow-hidden relative me-2">
                            <Gradient gradientIndex={group.gradientIndex} />
                        </div>
                        {group.title}
                    </Command.Item>
                {/each}
            </Command.Group>
        {/if}
    </Command.List>
</Command.Dialog>