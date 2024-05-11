<script lang="ts">
    import { Slider } from '@repo/ui/components/slider';
    import { listColumns } from '$lib/stores';
	import { onMount } from 'svelte';

    export let max = 5;

    const excludedNodeNames = ['INPUT', 'TEXTAREA'];

    onMount(() => {
        
		document.addEventListener('keydown', setListColumns);
        return () => document.removeEventListener('keydown', setListColumns);
    });

    function sliderValueChange(value: number[]) {
		listColumns.set(value[0]);
	}

    function setListColumns(e: KeyboardEvent) {
        if (excludedNodeNames.includes(document.activeElement?.nodeName || '')) return;
        for (let i = 1; i <= max; i++) {
            if (e.key === i.toString()) {
                listColumns.set(i);
            }
        }
    }

</script>

<Slider
    class="w-[200px]"
    value={[$listColumns]}
    max={max}
    step={1}
    min={1}
    onValueChange={sliderValueChange}
/>