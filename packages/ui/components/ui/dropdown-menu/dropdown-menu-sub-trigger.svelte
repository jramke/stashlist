<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$ui/utils';
	import { ChevronRight } from 'lucide-svelte';

	type $$Props = DropdownMenuPrimitive.SubTriggerProps & {
		inset?: boolean;
	};
	type $$Events = DropdownMenuPrimitive.SubTriggerEvents;

	let className: $$Props['class'] = undefined;
	export let inset: $$Props['inset'] = undefined;
	export { className as class };
</script>

<DropdownMenuPrimitive.SubTrigger
	class={cn(
		`border border-transparent 
		flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none 
		data-[highlighted]:bg-secondary data-[state=open]:bg-secondary 
		data-[highlighted]:text-accent-foreground data-[state=open]:text-accent-foreground 
		data-[highlighted]:shadow-inner data-[state=open]:shadow-inner 
		data-[highlighted]:shadow-primary/20 data-[state=open]:shadow-primary/20 
		data-[highlighted]:border-primary data-[state=open]:border-primary`,
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
</DropdownMenuPrimitive.SubTrigger>
