<script lang="ts">
	import { Switch as SwitchPrimitive } from 'bits-ui';
	import { cn } from '$ui/utils';

	type $$Props = SwitchPrimitive.Props;

	let className: $$Props['class'] = undefined;
	export let checked: $$Props['checked'] = undefined;
	export { className as class };
</script>

<SwitchPrimitive.Root
	bind:checked
	class={cn(
		`peer inline-flex h-[20px] w-[40px] shrink-0 cursor-pointer items-center rounded-full border-2 border-primary transition-colors 
		focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background 
		disabled:cursor-not-allowed disabled:opacity-35 
		data-[state=checked]:bg-accent-foreground data-[state=checked]:border-accent-foreground
		data-[state=unchecked]:bg-input data-[state=unchecked]:shadow-inner data-[state=unchecked]:shadow-secondary`,
		className
	)}
	{...$$restProps}
>
	<SwitchPrimitive.Thumb
		class={cn(
			`pointer-events-none block h-4 w-4 rounded-full bg-background transition-all 
			data-[state=checked]:translate-x-5 data-[state=checked]:shadow-[0_0px_5px_0px_rgba(0,0,0,1)]
			data-[state=unchecked]:translate-x-0`
		)}
	/>
</SwitchPrimitive.Root>
