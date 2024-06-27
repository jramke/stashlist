<script lang="ts">
	import { Command as CommandPrimitive } from "cmdk-sv";
	import { cn } from "$ui/utils";

	type $$Props = CommandPrimitive.CommandProps;

	export let value: $$Props["value"] = undefined;

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<CommandPrimitive.Root
	class={cn(
		"flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
		"[&_[data-cmdk-group-heading]]:px-2 [&_[data-cmdk-group-heading]]:font-medium [&_[data-cmdk-group-heading]]:text-muted-foreground [&_[data-cmdk-group]:not([hidden])_~[data-cmdk-group]]:pt-0 [&_[data-cmdk-input-wrapper]_svg]:h-5 [&_[data-cmdk-input-wrapper]_svg]:w-5 [&_[data-cmdk-input]]:h-[calc(3rem+1px)] [&_[data-cmdk-item]]:py-3 [&_[data-cmdk-item]_svg]:h-4 [&_[data-cmdk-item]_svg]:w-4",
		className
	)}
	bind:value
	{...$$restProps}
>
	<slot />
</CommandPrimitive.Root>
