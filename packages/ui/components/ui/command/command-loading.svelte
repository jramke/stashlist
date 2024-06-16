<script lang="ts">
	import { Command as CommandPrimitive } from "cmdk-sv";
	import { cn } from "$ui/utils";
    import { Loader } from "lucide-svelte";

	type $$Props = CommandPrimitive.LoadingProps;
	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<CommandPrimitive.Loading class={cn("py-6 text-sm text-muted-foreground [&_>*]:flex [&_>*]:items-center [&_>*]:justify-center [&_>*]:gap-2", className)} {...$$restProps}>
	<Loader class="size-4 animate-spin" />
	<slot />
</CommandPrimitive.Loading>