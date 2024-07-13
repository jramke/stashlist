<script lang="ts">
	import { listLayout } from '$lib/stores';
	import { cn } from '@repo/ui/utils';

    let className: string | undefined | null = undefined;
	export { className as class };

</script>

{#if $listLayout !== 'list'}
    <div class={cn("relative shadow-md shadow-black/50 rounded-sm overflow-hidden mb-2 border border-black/50", className)}>
        <slot />
    </div>
{/if}