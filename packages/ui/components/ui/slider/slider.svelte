<script lang="ts">
	import { Slider as SliderPrimitive } from "bits-ui";
	import { cn } from "$ui/utils";

	type $$Props = SliderPrimitive.Props;

	let className: $$Props["class"] = undefined;
	export let value: $$Props["value"] = [0];
	export { className as class };
</script>

<SliderPrimitive.Root
	bind:value
	class={cn("relative flex w-full touch-none select-none items-center cursor-pointer group", className)}
	{...$$restProps}
	let:thumbs
>
	<span class="relative h-1 w-full grow overflow-hidden rounded-full bg-accent my-2">
		<SliderPrimitive.Range class="absolute h-full bg-accent-foreground" />
	</span>
	{#each thumbs as thumb}
		<SliderPrimitive.Thumb
			{thumb}
			class="block h-4 w-4 rounded-full border-2 border-accent-foreground bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-foreground focus-visible:ring-offset-2 active:ring-1 active:ring-accent-foreground active:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
		/>
	{/each}
</SliderPrimitive.Root>
