<script lang="ts">
	import { cn } from "@repo/ui/utils";

    let className: string | undefined | null = undefined;
	export { className as class };
</script>

<span class={cn("line-clamp-1 text-sm text-muted-foreground break-all max-w-[80%]", className)}>
    <slot />
</span>