<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { Command as CommandPrimitive } from "cmdk-sv";
	import Search from "lucide-svelte/icons/search";
	import { cn } from "$ui/utils";

	type $$Props = CommandPrimitive.InputProps & {
		class?: string;
		icon?: ComponentType | null | undefined;
	};

	let className: string | undefined | null = undefined;
	export { className as class };
	export let value: string = "";
	export let icon: ComponentType | null | undefined = Search;
</script>

<div class="flex items-center border-b px-5 bg-card/50" data-cmdk-input-wrapper="">
	<!-- <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" /> -->
	<svelte:component this={icon} class="mr-2 h-4 w-4 shrink-0 opacity-50" />
	<CommandPrimitive.Input
		class={cn(
			"flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
			className
		)}
		{...$$restProps}
		bind:value
	/>
</div>
