<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$ui/utils';
	import { page } from '$app/stores';

	type $$Props = DropdownMenuPrimitive.ItemProps & {
		inset?: boolean;
	};
	type $$Events = DropdownMenuPrimitive.ItemEvents;

	let className: $$Props['class'] = undefined;
	export let inset: $$Props['inset'] = undefined;
	export let href: $$Props['href'] = undefined;
	export { className as class };
</script>

<DropdownMenuPrimitive.Item
	class={cn(
		`border border-transparent cursor-pointer
		relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 my-1 text-sm outline-none 
		data-[disabled]:pointer-events-none data-[disabled]:opacity-50 
		data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:shadow-inner data-[highlighted]:shadow-popover data-[highlighted]:border-accent`,
		inset && 'pl-8',
		$page.url.pathname === href && 'bg-accent text-accent-foreground shadow-inner shadow-popover border-accent pointer-events-none',
		className
	)}
	href={href}
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
