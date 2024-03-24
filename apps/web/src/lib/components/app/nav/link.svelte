<script lang="ts">
	import { Button } from '@repo/ui/components/button';
	import { page } from '$app/stores';
	import { cn } from '@repo/ui/utils';

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
