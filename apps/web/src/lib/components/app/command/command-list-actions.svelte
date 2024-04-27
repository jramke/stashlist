<script lang="ts">
    import * as Command from "@repo/ui/components/command";
    import { siteConfig } from "$lib/config/site";
	import { getCommandMenuContext } from "./context";
    import { newGroupDialogOpen, editGroupsDialogOpen, liveView } from "$lib/stores";
	import { Inbox, Masonry, Pencil, Plus, Stash, Tv } from "@repo/ui/icons";
	import { Shortcut } from "@repo/ui/components/shortcut";

    const ctx = getCommandMenuContext();
    const handleItemSelect = ctx.handleItemSelect;
    const changePage = ctx.changePage;

</script>

<Command.Group heading="Views">
    <Command.Item onSelect={() => handleItemSelect(siteConfig.appUrl)} value="All stashes">
        <Stash class="me-2 shrink-0" />
        Show all
        <Command.Shortcut>
            <Shortcut keys={['command', 'A']} />
        </Command.Shortcut>
    </Command.Item>
    <Command.Item onSelect={() => handleItemSelect(siteConfig.appUrl + '/unsorted')} value="Unsorted">
        <Inbox class="me-2 shrink-0" />
        Show unsorted
        <Command.Shortcut>
            <Shortcut keys={['command', 'U']} />
        </Command.Shortcut>
    </Command.Item>
</Command.Group>
<Command.Group heading="Actions">
    <Command.Item onSelect={() => handleItemSelect(() => newGroupDialogOpen.set(true))}>
        <Plus class="me-2 shrink-0" />
        Create new group
    </Command.Item>
    <Command.Item onSelect={() => handleItemSelect(() => editGroupsDialogOpen.set(true))}>
        <Pencil class="me-2 shrink-0" />
        Edit groups
    </Command.Item>
    <Command.Item onSelect={() => handleItemSelect(() => liveView.update(state => !state))} value="Togle live view">
        <Tv class="me-2 shrink-0" />
        Toggle live view
        <Command.Shortcut>
            <Shortcut keys={['command', 'G']} />
        </Command.Shortcut>
    </Command.Item>
    <Command.Item onSelect={() => handleItemSelect(() => changePage({name: 'layouts'}), undefined, false)} value="Change layout">
        <Masonry class="me-2 shrink-0" />
        Change layout
        <Command.Shortcut>
            <Shortcut keys={['command', 'L']} />
        </Command.Shortcut>
    </Command.Item>
</Command.Group>