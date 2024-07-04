<script lang="ts">
	import { cn } from '$ui/utils';

	let className: string | undefined | null = undefined;
	let id: string | undefined | null = undefined;
	export { 
		className as class,
		id
	};
</script>

<section class={cn('w-full py-16', className)} {id}>
	<slot />
</section>
