<script lang="ts">
    import { Logo } from '@repo/ui/icons';
    import { onMount } from 'svelte';
	import * as rive from "@rive-app/canvas";
    import { Motion } from "svelte-motion";
	import { cn } from '@repo/ui/utils';

    export let replacerLogoClass = '';
    export let poofClass = '';
    export let poofCallback = () => {};
    export let delay = 0;
    export let playPoof = false;
    let thisPlayPoof = false;

    let canvas: HTMLCanvasElement;
    let wrapper: HTMLElement;
    let replacerVisible = false;
    let width: number|string = 'auto';
    let replacerScale = 1.15;

    let poof: any;

    onMount(() => {
        
        width = wrapper?.clientWidth;

        poof = new rive.Rive({
            src: "/poof.riv",
            canvas: canvas,
            onPlay: () => {
                canvas.classList.remove('hidden');
                poof.resizeDrawingSurfaceToCanvas();
            },
            onStop: () => {
                canvas.classList.add('hidden');
            }
        });

	});

    $: if(playPoof || thisPlayPoof) {
        setTimeout(() => {
            if (replacerVisible) {
                return;
            }
            poof.play();
            width = 28;
            replacerVisible = true;
            replacerScale = 1;
            setTimeout(() => {
                poofCallback();
            }, 1050); // delay until poof is optically played
        }, delay);
    }
    
    function handleClick() {
        poof.play();
        width = 28;
        replacerVisible = true;
        replacerScale = 1;
    }

</script>

<Motion let:motion animate={{ width }}>
    <span use:motion class="relative !inline-flex items-center justify-center !m-0" bind:this={wrapper}>
        <canvas bind:this={canvas} class={cn("absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 hidden z-50", poofClass)}></canvas>
        <Motion let:motion animate={{ scale: replacerScale }}>
            <span use:motion class="inline" class:hidden={!replacerVisible}>
                <Logo class={cn("inline size-6", replacerLogoClass)} />
            </span>
        </Motion>
        <Motion let:motion whileHover={{ scale: 1.2 }}>
            <button use:motion class="cursor-pointer inline focusable" class:hidden={replacerVisible} on:click={() => {
                delay = 0;
                thisPlayPoof = true;
            }}>
                <slot />
            </button>
        </Motion>
    </span>
</Motion>