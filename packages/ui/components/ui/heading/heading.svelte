<script lang="ts">
	import { cn } from '$ui/utils';

	let className: string | undefined | null = undefined;
	export { className as class };
	export let tag = 'h2';

	//TODO: type
	let classByTag: any = {
		h1: 'text-4xl sm:text-6xl leading-none',
		h2: 'text-3xl sm:text-4xl leading-none'
	};
</script>

<svelte:element this={tag} class={cn('mb-6 font-bold', classByTag[tag], className)}>
	<slot />
</svelte:element>
