<script lang="ts">
	import { Command as CommandPrimitive } from "cmdk-sv";
	import { cn } from "$ui/utils";

	type $$Props = CommandPrimitive.ItemProps;

	export let asChild = false;

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<CommandPrimitive.Item
	{asChild}
	class={cn(
		`border border-transparent 
		relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none 
		data-[disabled]:pointer-events-none data-[disabled]:opacity-50 
		aria-selected:bg-accent aria-selected:text-accent-foreground aria-selected:shadow-inner aria-selected:shadow-popover aria-selected:border-accent`,
		className
	)}
	{...$$restProps}
	let:action
	let:attrs
>
	<slot {action} {attrs} />
</CommandPrimitive.Item>
