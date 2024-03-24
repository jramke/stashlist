<script lang="ts">
    import { Logo, Stash } from '@repo/ui/icons';
    import { onMount } from 'svelte';
	import * as rive from "@rive-app/canvas";

    let canvas: HTMLCanvasElement;
    let replacer: HTMLElement;
    let replaceWrapper: HTMLElement;

    onMount(() => {

        const poof = new rive.Rive({
            src: "/poof.riv",
            canvas: canvas,
            // autoplay: true,
            // animations: 'idle',
            // onLoad: () => {
            // 	poof.resizeDrawingSurfaceToCanvas();
            // },
            onPlay: () => {
                canvas.classList.remove('hidden');
                poof.resizeDrawingSurfaceToCanvas();
            },
            onStop: () => {
                canvas.classList.add('hidden');
            }
        });


        replaceWrapper.addEventListener('click', () => {
            // replaceWrapper.classList.remove('cursor-pointer');
            // replaceWrapper.classList.add('hidden');
            replaceWrapper.className = 'hidden';

            replacer.classList.add('inline');
            replacer.classList.remove('hidden');

            poof.play();
        })

	})
</script>

<div class="relative inline">
    <div bind:this={replaceWrapper} class="cursor-pointer inline">
        <slot />
    </div>
    <div class="hidden relative" bind:this={replacer}>
        <canvas bind:this={canvas} class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 hidden"></canvas>
        <Logo class="h-6 w-6 inline -mt-1" /> 
    </div>
</div>