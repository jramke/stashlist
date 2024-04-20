<script lang="ts">
    import * as Command from "@repo/ui/components/command";
    import { siteConfig } from "$lib/config/site";
	import { getCommandMenuContext } from "./context";
    import { listLayout } from "$lib/stores";

    const ctx = getCommandMenuContext();
    const handleItemSelect = ctx.handleItemSelect;

</script>

<Command.Group heading="Layouts">
    <Command.Item onSelect={() => handleItemSelect(() => listLayout.set('grid'))}>Grid layout</Command.Item>
    <Command.Item onSelect={() => handleItemSelect(() => listLayout.set('list'))}>List layout</Command.Item>
    <Command.Item onSelect={() => handleItemSelect(() => listLayout.set('masonry'))}>Masonry layout</Command.Item>
</Command.Group>