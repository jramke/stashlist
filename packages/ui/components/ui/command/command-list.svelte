<script lang="ts">
	import { Command as CommandPrimitive } from "cmdk-sv";
	import { cn } from "$ui/utils";
    import { ScrollArea } from "$ui/components/ui/scroll-area";

	type $$Props = CommandPrimitive.ListProps;
	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<CommandPrimitive.List
	class={cn("flex-grow", className)}
	{...$$restProps}
>
	<ScrollArea class="max-h-[349px] p-3 scroll-py-3 data-[scrollbar-visible=true]:pe-0">
		<slot />
	</ScrollArea>
</CommandPrimitive.List>
