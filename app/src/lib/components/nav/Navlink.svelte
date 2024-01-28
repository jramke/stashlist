<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';

	export let path: string;
</script>

<a
	href={path}
	class={cn(
		'transition-colors hover:text-foreground/80',
		$page.url.pathname === path ? 'text-foreground' : 'text-foreground/60'
	)}
>
	<slot />
</a>
