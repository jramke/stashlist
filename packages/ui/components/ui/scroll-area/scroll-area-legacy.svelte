<script lang="ts">
	import { cn } from "$ui/utils";
    import { onMount } from "svelte";

	let className: string | undefined | null = undefined;
	export { className as class };

	let scrollArea: HTMLDivElement;
	let scrollbarVisible = false;

	onMount(() => {
		const observer = new ResizeObserver(() => {
			scrollbarVisible = scrollArea.scrollHeight > scrollArea.clientHeight;
		});
		observer.observe(scrollArea);
		return () => observer.disconnect();
	});

</script>

<div class={cn(className, 'scroll-area')} data-scrollbar-visible={scrollbarVisible} bind:this={scrollArea}>
	<slot />
</div>

<style lang="postcss">
	.scroll-area {
		overflow-y: auto;
		background-clip: border-box;

		&::-webkit-scrollbar {
			background: transparent;
		}

		&::-webkit-scrollbar-thumb {
			border-color: rgba(0,0,0,0);
			border-style: solid;
			border-width: 6px;
			background-clip: padding-box;
			border-radius: 9999px;
			background-color: hsl(var(--accent));
		}

		&::-webkit-scrollbar-thumb:hover {
			background-color: hsl(var(--foreground) / 0.4);
		}
	}
</style>