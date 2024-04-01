<script lang="ts">
	import { gradients } from "$lib/constants";
	import { cn } from "@repo/ui/utils";

    export let gradientIndex: number;
    
</script>

<div class={cn(
    `absolute inset-0 h-full w-full`,
    gradientIndex === -1 ? 'bg-muted' : `${gradients[gradientIndex].class} to-90%`
)}></div>
