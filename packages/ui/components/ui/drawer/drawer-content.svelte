<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import DrawerOverlay from "./drawer-overlay.svelte";
	import { cn } from "$ui/utils";

	type $$Props = DrawerPrimitive.ContentProps & {
		layoutDirection?: 'bottom' | 'right';
	};

	let className: $$Props["class"] = undefined;
	export { className as class };
	export let layoutDirection: $$Props['layoutDirection'] = 'bottom';
</script>

<DrawerPrimitive.Portal>
	<DrawerOverlay />
	<DrawerPrimitive.Content
		class={cn(
			'fixed z-50',
			layoutDirection === 'bottom' && "inset-x-0 bottom-0 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
			layoutDirection === 'right' && "bottom-0 top-0 right-0 left-auto w-[500px] after:!content-none flex",
			className
		)}
		{...$$restProps}
	>
		{#if layoutDirection === 'bottom'}
			<div class="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted"></div>
		{/if}
		{#if layoutDirection === 'right'}
			<div class="m-[16px] rounded-[10px] max-w-[calc(100%-(16px*2))] flex flex-col basis-full border bg-background">
				<div class="absolute top-1/2 -translate-y-1/2 -left-4 p-4">
					<div class="w-1 flex-shrink-0 h-[100px] rounded-full bg-accent-foreground/80"></div>
				</div>
				<slot />
			</div>
		{:else}
			<slot />
		{/if}
	</DrawerPrimitive.Content>
</DrawerPrimitive.Portal>
