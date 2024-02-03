<script lang="ts">
	import { cn } from '$lib/utils';

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<section class={cn('py-10 w-full', className)}>
	<slot />
</section>
