<script lang="ts">
    import * as Tooltip from "@repo/ui/components/tooltip";
    import { Copy } from "@repo/ui/icons";
	import { cn } from "@repo/ui/utils";
	// import { Motion } from "svelte-motion";

    export let copyString = '';
    export let copyText = 'Copy to clipboard';
    export let copiedText = 'Copied!';
    export let copyButtonClass = '';

    let currentCopyText = copyText;
    let copyOpen = false;

    function handleUrlCopy(url: string) {
        navigator.clipboard.writeText(url);
        copyOpen = true;
        currentCopyText = copiedText;
    }

    function handleUrlCopyOpenChange(open: boolean) {
        if (!open) {
            currentCopyText = copyText;
        }
    }

</script>

<Tooltip.Root disableHoverableContent={true} open={copyOpen} closeOnPointerDown={false} onOpenChange={handleUrlCopyOpenChange}>
    <Tooltip.Trigger asChild let:builder>
        <button use:builder.action {...builder} type="button" aria-label={currentCopyText} class={cn('focusable size-4', copyButtonClass)} on:click={() => handleUrlCopy(copyString)}>
            <Copy class="w-full h-full" />
        </button>
    </Tooltip.Trigger>
    <Tooltip.Content>
        {currentCopyText}
    </Tooltip.Content>
</Tooltip.Root>