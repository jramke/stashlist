<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$ui/utils';

	type $$Props = DropdownMenuPrimitive.ItemProps & {
		inset?: boolean;
	};
	type $$Events = DropdownMenuPrimitive.ItemEvents;

	let className: $$Props['class'] = undefined;
	export let inset: $$Props['inset'] = undefined;
	export { className as class };
</script>

<DropdownMenuPrimitive.Item
	class={cn(
		`border border-transparent 
		relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none 
		data-[disabled]:pointer-events-none data-[disabled]:opacity-50 
		data-[highlighted]:bg-secondary data-[highlighted]:text-accent-foreground data-[highlighted]:shadow-inner data-[highlighted]:shadow-primary/20 data-[highlighted]:border-primary`,
		inset && 'pl-8',
		className
	)}
	{...$$restProps}
	on:click
	on:keydown
	on:focusin
	on:focusout
	on:pointerdown
	on:pointerleave
	on:pointermove
>
	<slot />
</DropdownMenuPrimitive.Item>
