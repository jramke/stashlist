<script lang="ts">
	import { cn } from '$lib/utils';

	let className: string | undefined | null = undefined;
	export { className as class };
	export let tag = 'h2';

	//TODO: type
	let classByTag: any = {
		h1: 'text-6xl leading-tight',
		h2: 'text-4xl leading-tight'
	};
</script>

<svelte:element this={tag} class={cn('mb-6 font-bold', classByTag[tag], className)}>
	<slot />
</svelte:element>
