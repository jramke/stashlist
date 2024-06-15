<script lang="ts">
    import { Logo } from '@repo/ui/icons';
    import { onMount } from 'svelte';
	import * as rive from "@rive-app/canvas";
    import { Motion } from "svelte-motion";

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
    
    function handleClick() {
        poof.play();
        width = 28;
        replacerVisible = true;
        replacerScale = 1;
    }

</script>

<Motion let:motion animate={{ width }}>
    <span use:motion class="relative !inline-flex items-center justify-center !m-0" bind:this={wrapper}>
        <canvas bind:this={canvas} class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 hidden z-50"></canvas>
        <Motion let:motion animate={{ scale: replacerScale }}>
            <span use:motion class="inline" class:hidden={!replacerVisible}>
                <Logo class="h-6 w-6 inline -mt-2" />
            </span>
        </Motion>
        <Motion let:motion whileHover={{ scale: 1.2 }}>
            <button use:motion class="cursor-pointer inline" class:hidden={replacerVisible} on:click={handleClick}>
                <slot />
            </button>
        </Motion>
    </span>
</Motion>