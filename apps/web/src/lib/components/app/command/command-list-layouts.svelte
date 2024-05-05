<script lang="ts">
    import * as Command from "@repo/ui/components/command";
    import { siteConfig } from "$lib/config/site";
	import { getCommandMenuContext } from "./context";
    import { listLayout } from "$lib/stores";
	import { LayoutGrid, StretchHorizontal, Masonry } from "@repo/ui/icons";

    const ctx = getCommandMenuContext();
    const handleItemSelect = ctx.handleItemSelect;


</script>

<Command.Group heading="Layouts">
    <Command.Item onSelect={() => handleItemSelect(() => listLayout.set('grid'))} value="Grid layout">
        <LayoutGrid class="me-2 shrink-0" />
        Grid layout
        {#if $listLayout === 'grid'}
            <span class="text-muted-foreground text-xs ms-auto mt-1">current</span>              
        {/if}
    </Command.Item>
    <Command.Item onSelect={() => handleItemSelect(() => listLayout.set('list'))} value="List layout">
        <StretchHorizontal class="me-2 shrink-0" />
        List layout
        {#if $listLayout === 'list'}
            <span class="text-muted-foreground text-xs ms-auto mt-1">current</span>              
        {/if}
    </Command.Item>
    <Command.Item onSelect={() => handleItemSelect(() => listLayout.set('masonry'))} value="Masonry layout">
        <Masonry class="me-2 shrink-0" />
        Masonry layout
        {#if $listLayout === 'masonry'}
            <span class="text-muted-foreground text-xs ms-auto mt-1">current</span>              
        {/if}
    </Command.Item>
</Command.Group>