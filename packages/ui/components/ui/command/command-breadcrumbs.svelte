<script lang="ts">
	import { cn } from "$ui/utils";

	export let pages: string[] = [];
	export let onPageClick: (page: string) => void = () => {};
	let className: string | undefined | null = undefined;
	export { className as class };

</script>

<div class={cn("p-4 pb-1 text-[0.65rem] flex items-center gap-2 bg-card/50", className)} data-cmdk-breadcrumbs="">
	{#each pages as page, i}
		<button class="focusable text-primary-foreground py-[0.2rem] px-[0.4rem] bg-accent shadow-inner shadow-popover border border-accent rounded-sm" on:click={() => onPageClick(page)}>{page}</button>
	{/each}
</div>