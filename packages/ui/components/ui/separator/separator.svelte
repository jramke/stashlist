<script lang="ts">
	import { Separator as SeparatorPrimitive } from 'bits-ui';
	import { cn } from '$ui/utils';

	type $$Props = SeparatorPrimitive.Props;

	let className: $$Props['class'] = undefined;
	export let orientation: $$Props['orientation'] = 'horizontal';
	export let decorative: $$Props['decorative'] = undefined;
	export { className as class };
</script>

<SeparatorPrimitive.Root
	class={cn(
		'shrink-0',
		orientation === 'horizontal' ? 'my-3 h-[1px] w-full bg-gradient-to-r from-border/0 via-border to-border/0' : 'mx-3 h-full w-[1px] bg-gradient-to-t from-border/0 via-border to-border/0',
		className
	)}
	{orientation}
	{decorative}
	{...$$restProps}
/>
