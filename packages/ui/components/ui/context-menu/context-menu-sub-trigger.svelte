<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { ChevronRight } from "lucide-svelte";
	import { cn } from "$ui/utils";

	type $$Props = ContextMenuPrimitive.SubTriggerProps & {
		inset?: boolean;
	};
	type $$Events = ContextMenuPrimitive.SubTriggerEvents;

	let className: $$Props["class"] = undefined;
	export let inset: $$Props["inset"] = undefined;
	export { className as class };
</script>

<ContextMenuPrimitive.SubTrigger
	class={cn(
		`border border-transparent 
		flex cursor-default select-none items-center rounded-sm px-2 py-1.5 my-1 text-sm outline-none 
		data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:shadow-inner data-[highlighted]:shadow-popover data-[highlighted]:border-accent 
		data-[state=open]:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:shadow-inner data-[state=open]:shadow-popover data-[state=open]:border-accent`,
		inset && 'pl-8',
		className
	)}
	{...$$restProps}
	on:click
	on:keydown
	on:focusin
	on:focusout
	on:pointerleave
	on:pointermove
>
	<slot />
	<ChevronRight class="ml-auto h-4 w-4" />
</ContextMenuPrimitive.SubTrigger>
