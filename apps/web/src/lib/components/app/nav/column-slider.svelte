<script lang="ts">
    import { Slider } from '@repo/ui/components/slider';
    import { listColumns } from '$lib/stores';
	import { onMount } from 'svelte';

    export let max = 5;
    export let min = 1;

    const excludedNodeNames = ['INPUT', 'TEXTAREA'];

    const colToWidth = {
        1: 550,
        2: 750,
    };

    onMount(() => {
        setDefaultColForWidth();
		document.addEventListener('keydown', setListColumns); 
        window.addEventListener('resize',setDefaultColForWidth);
        return () => {
            document.removeEventListener('keydown', setListColumns);
            window.removeEventListener('resize',setDefaultColForWidth);
        };
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

    function setDefaultColForWidth() {
        if (!window) return;  
        
        let col = $listColumns;

        for (const [key, value] of Object.entries(colToWidth)) {
            if (window.innerWidth < value) {
                col = parseInt(key);
                break;
            }
        }

        listColumns.set(col);
    }

</script>

<Slider
    class="w-[200px]"
    value={[$listColumns]}
    max={max}
    step={1}
    min={min}
    onValueChange={sliderValueChange}
/>