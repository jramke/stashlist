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
	<span class="relative h-1.5 w-full grow rounded-full bg-accent my-2 shadow-inner shadow-secondary border-accent border">
		<SliderPrimitive.Range class="absolute h-full bg-accent-foreground rounded-full ring-1 ring-accent-foreground" />
	</span>
	{#each thumbs as thumb}
		<SliderPrimitive.Thumb
			{thumb}
			class="shadow-[0_0px_5px_2px_rgba(0,0,0,.8)] block h-4 w-4 rounded-full border-2 border-accent-foreground bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-foreground focus-visible:ring-offset-2 active:ring-1 active:ring-accent-foreground active:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
		/>
	{/each}
</SliderPrimitive.Root>
