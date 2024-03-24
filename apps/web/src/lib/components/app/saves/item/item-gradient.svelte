<script lang="ts">
	import { gradients } from "$lib/constants";

    export let gradientIndex: number;
    
</script>

<div class={`absolute inset-0 h-full w-full ${gradients[gradientIndex].class} to-90%`}></div>
