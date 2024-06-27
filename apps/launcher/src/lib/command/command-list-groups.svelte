<script lang="ts">
    import * as Command from "@repo/ui/components/command";
    import { siteConfig } from "@repo/constants";
	import { getCommandMenuContext } from "./context";
    import { Gradient } from "@repo/ui/components/gradient";

    export let groups: any[]

    const ctx = getCommandMenuContext();
    const handleItemSelect = ctx.handleItemSelect;
    const changePage = ctx.changePage;

</script>

{#if groups && groups.length > 0}    
    <Command.Group heading="Groups">
        {#each groups as group}
            <Command.Item value={'group-' + group.id} onSelect={() => handleItemSelect(siteConfig.fullAppUrl + '/group/' + group.id, () => changePage({ name: group.title, id: 'group-' + group.id, groupId: group.id }))}>
                <div class="rounded-full bg-secondary size-4 overflow-hidden relative me-2">
                    <Gradient gradientIndex={group.gradientIndex} />
                </div>
                <span class="truncate max-w-[80%]">
                    {group.title}
                </span>
            </Command.Item>
        {/each}
    </Command.Group>
{/if}