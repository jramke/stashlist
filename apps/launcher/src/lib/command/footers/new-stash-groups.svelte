<script lang="ts">
    import * as Command from "@repo/ui/components/command";
    import { Separator } from "@repo/ui/components/separator";
    import { Shortcut } from "@repo/ui/components/shortcut";
</script>

<Command.Footer class="flex items-center justify-end mt-auto">
    <div class="flex items-center gap-2">
        Toggle groups
        <Shortcut keys={['command', 'enter']} />
    </div>
    <Separator orientation="vertical" />
    <div class="flex items-center gap-2">
        Create stash
        <Shortcut keys={['enter']} />
    </div>
</Command.Footer>