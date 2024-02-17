<script lang="ts">
	import { cn } from '@ui/lib/utils';

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<section class={cn('w-full py-10', className)}>
	<slot />
</section>
