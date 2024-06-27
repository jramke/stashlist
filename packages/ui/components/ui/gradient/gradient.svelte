<script lang="ts">
	import { gradients } from "@repo/constants";
	import { cn } from "$ui/utils";

    export let gradientIndex: number | null;

    if (gradientIndex === null) {
        gradientIndex = -1
    }
    
</script>

<div class={cn(
    `absolute inset-0 h-full w-full`,
    gradientIndex === -1 ? 'bg-muted' : `${gradients[gradientIndex].class} to-90%`
)}></div>
