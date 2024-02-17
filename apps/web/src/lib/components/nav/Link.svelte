<script lang="ts">
	import { Button } from '@ui/components/ui/button';
	import { page } from '$app/stores';
	import { cn } from '@ui/lib/utils';

	let className: string | undefined | null = undefined;
	export { className as class };
	export let path: string;
</script>

<Button
	variant="nav"
	href={path}
	class={cn('w-full justify-start', $page.url.pathname === path && 'active', className)}
>
	<slot />
</Button>
