<script lang="ts">
    import type { Icon } from "lucide-svelte";
    import type { ComponentType } from 'svelte';

    import { cn } from '$ui/utils';
    import { ArrowBigUp, CornerDownLeft, Command, Space } from 'lucide-svelte';

    let className: string | undefined | null = undefined;
    export { className as class };
    export let keys: string[] = [];

    type KeysAsIcons = {
        [key: string]: ComponentType<Icon>
    }
    const keysAsIcons = {
        'shift': ArrowBigUp,
        'enter': CornerDownLeft,
        'command': Command,
        'space': Space,
    } as KeysAsIcons;

</script>


<div class={cn("text-xs tracking-widest text-muted-foreground flex items-center gap-0.5", className)}>
    {#each keys as key}
        <kbd class="bg-accent shadow-inner shadow-popover border border-accent size-[20px] flex items-center justify-center rounded-sm">
            {#if key in keysAsIcons}
                <span class="sr-only">{key}</span>
                {#if key === 'enter' || key === 'space'}
                    <svelte:component this={keysAsIcons[key]} class="!size-[12px] stroke-[2.5]" />
                {:else if key === 'command'}
                    <svelte:component this={keysAsIcons[key]} class="!size-[11.5px] stroke-[2.5]" />
                {:else}
                    <svelte:component this={keysAsIcons[key]} class="!size-[15px] stroke-2" />
                {/if}
            {:else}
                {key}
            {/if}
        </kbd>
    {/each}
</div>