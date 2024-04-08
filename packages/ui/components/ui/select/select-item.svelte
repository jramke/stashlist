<script lang="ts">
	import { cn } from '$ui/utils';
	import { Select as SelectPrimitive } from 'bits-ui';
	import { Check } from 'lucide-svelte';

	type $$Props = SelectPrimitive.ItemProps;
	type $$Events = SelectPrimitive.ItemEvents;

	let className: $$Props['class'] = undefined;
	export let value: $$Props['value'];
	export let label: $$Props['label'] = undefined;
	export let disabled: $$Props['disabled'] = undefined;
	export { className as class };
</script>

<SelectPrimitive.Item
	{value}
	{disabled}
	{label}
	class={cn(
		`border border-transparent 
		relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-6 pr-2 text-sm outline-none 
		data-[disabled]:pointer-events-none data-[disabled]:opacity-50
		data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:shadow-inner data-[highlighted]:shadow-popover data-[highlighted]:border-accent`,
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
	<span class="absolute left-1.5 flex h-3 w-3 items-center justify-center">
		<SelectPrimitive.ItemIndicator>
			<Check class="h-3.5 w-3.5" />
		</SelectPrimitive.ItemIndicator>
	</span>
	<slot />
</SelectPrimitive.Item>
