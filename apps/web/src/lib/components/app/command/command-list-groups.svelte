<script lang="ts">
	import type { TODO } from "$lib/types";

    import * as Command from "@repo/ui/components/command";
    import { siteConfig } from "$lib/config/site";
	import { getCommandMenuContext } from "./context";
    import { Gradient } from "$lib/components/app";

    export let groups: TODO[]

    const ctx = getCommandMenuContext();
    const handleItemSelect = ctx.handleItemSelect;
    const changePage = ctx.changePage;

</script>

{#if groups && groups.length > 0}    
    <Command.Group heading="Groups">
        {#each groups as group}
            <Command.Item value={'group-' + group.id} onSelect={() => handleItemSelect(siteConfig.appUrl + '/group/' + group.id, () => changePage({ name: group.title, groupId: group.id }))}>
                <div class="rounded-full size-4 overflow-hidden relative me-2">
                    <Gradient gradientIndex={group.gradientIndex} />
                </div>
                <span class="truncate max-w-[80%]">
                    {group.title}
                </span>
            </Command.Item>
        {/each}
    </Command.Group>
{/if}