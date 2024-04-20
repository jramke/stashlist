<script lang="ts">
	import { Command as CommandPrimitive } from "cmdk-sv";
	import { cn } from "$ui/utils";

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<div class={cn("border-t p-3 text-xs", className)} data-cmdk-footer="">
	<slot/>
</div>