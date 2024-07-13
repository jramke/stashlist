<script lang="ts">
	import type { SelectSave } from "$lib/server/db/schema";
	import { Gradient } from "$lib/components/app";
	import { cn } from "@repo/ui/utils";
	import { listLayout } from "$lib/stores";

    export let title: SelectSave['title'];
    export let faviconUrl: SelectSave['faviconUrl'] = '';
    export let gradientIndex: SelectSave['gradientIndex'] | null = null;
    export let color: string = '';

    let className: string | undefined | null = undefined;
	export { className as class };

    let titleIconClass = 'size-4 rounded-[4px] overflow-hidden relative flex-shrink-0';
    
</script>

<div class="flex items-baseline gap-2">
    <div class="translate-y-[0.5px] flex-shrink-0">
        {#if faviconUrl}
            <img loading="lazy" class={titleIconClass} src={faviconUrl} alt="" on:error={() => faviconUrl = ''} />
        {:else if color}
            <div class={cn(titleIconClass)} style={`background-color: ${color}`}></div>
        {:else if gradientIndex}
            <div class={cn(titleIconClass)}>
                <Gradient {gradientIndex} />
            </div>
        {:else} 
            <slot {titleIconClass} />
        {/if}
    </div>
    {#if title}
        <h3 class={cn("line-clamp-1 text-lg font-bold break-words", className)}>{title}</h3>
    {/if}
</div>
