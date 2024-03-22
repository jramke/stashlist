<script lang="ts">
	import { cn } from '$ui/utils';

	let className: string | undefined | null = undefined;
	export { className as class };

</script>

<div class={cn("prose dark:prose-invert prose-neutral", className)}>
    <slot />
</div>