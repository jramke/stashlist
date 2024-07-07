<script lang="ts">
    import { GitHub } from '@repo/ui/icons';
	import {
		TwitterBookmark,
		Chrome,
		Codepen,
		Dribbble,
		Arc,
		Colors,
        Image,
		Text,
	} from '$lib/components/site/logos';
	import { animate, Motion } from 'svelte-motion';
	import VaultClipPath from './vault-clip-path.svelte';
	import { onMount } from 'svelte';
	import Icon from './icon.svelte';
	import { getHeroContext, setHeroContext } from './context';

    setHeroContext();

    const { widthPercentage, widthPercentageNumber, isMouseOver, manuallyAnimating, animateShimmer } = getHeroContext();

	let vaultPufferRef: HTMLDivElement;
	let left = 0;
	let localWidth = 0;
    let showIcons = false;

	onMount(() => {
        showIcons = true;

		if (vaultPufferRef) {
			const { left: newLeft, width: newLocalWidth } = vaultPufferRef.getBoundingClientRect();
			left = newLeft;
			localWidth = newLocalWidth;
		}

		window.addEventListener('mousemove', mouseMoveHandler);

        animateShimmer();

		return () => {
			window.removeEventListener('mousemove', mouseMoveHandler);
		};
	});

	function mouseMoveHandler(event: MouseEvent) {
		const { clientX } = event;	

		if (!vaultPufferRef || $manuallyAnimating) return;

		const relativeX = clientX - left;
		widthPercentageNumber.set(((relativeX / localWidth) * 100) - 20);
	}

	function mouseLeaveHandler() {
		isMouseOver.set(false);
	}
	function mouseEnterHandler() {
		isMouseOver.set(true);
	}
</script>


<div class="container text-center max-w-[60ch] flex flex-col items-center gap-6">
    <div class="relative w-[275px] sm:w-[375px] h-[210px] sm:h-[310px] grid place-content-center">
        {#if showIcons}
            <div class="relative size-10 z-20 hidden sm:block">
                <Icon x={-160} y={-190}>
                    <GitHub class="size-10" />
                </Icon>
                <Icon x={-300} y={-120}>
                    <Arc class="size-10" />
                </Icon>
                <Icon x={-360} y={-30}>
                    <Codepen class="size-10" />
                </Icon>
                <Icon x={-250} y={10}>
                    
                    <Image class="size-10" />
                </Icon>
                <Icon x={-320} y={80}>
                    <Colors class="size-10" />
                </Icon>

                <Icon x={240} y={-150}>
                    <TwitterBookmark class="size-10" />
                </Icon>
                <Icon x={360} y={-80}>
                    <Chrome class="size-10" />
                </Icon>
                <Icon x={270} y={0}>
                    <Text class="size-10" />
                </Icon>
                <Icon x={320} y={90}>
                    <Dribbble class="size-10" />
                </Icon>
            </div>
        {/if}
        <VaultClipPath />
        <div class="absolute inset-0 h-fit vault-clip-path -rotate-6 group">
            <Motion 
                let:motion 
                initial={{ opacity: 0 }}
                animate={{ opacity: isMouseOver ? 1 : 0 }}
                style={{ left: widthPercentage }}
                transition={{ duration: 0.3 }}
            >
                <div use:motion class="absolute shimmer left-full h-[200%] top-1/2 -translate-y-1/2 w-36 rotate-[19deg]"></div>
            </Motion>
            <img src="/vault.png" alt="Vault illustration" class="w-full" />
        </div>
        <div 
            aria-hidden="true"
            bind:this={vaultPufferRef} 
            on:mouseenter={mouseEnterHandler}
            on:mouseleave={mouseLeaveHandler}
            class="absolute inset-0 scale-150 z-10 rounded-3xl"
        ></div>
        <!-- gradient to fade out the vault -->
        <div class="absolute bottom-0 w-[100vw] left-1/2 -translate-x-1/2 h-[120px] bg-gradient-to-t from-background to-background/0"></div>
        <!-- block to hide the overlapping vault -->
        <div class="absolute top-full w-[100vw] left-1/2 -translate-x-1/2 h-1/2 bg-background"></div>
    </div>
    <div class="z-10 flex flex-col items-center gap-8">
        <slot />
    </div>
</div>

<style>
	.vault-clip-path {
		clip-path: url('#vault-clip-path');
	}
	.shimmer {
		background: linear-gradient(to right, #ffffff00 0%, #ffffff71 45%, #ffffff77 55%, #ffffff00 100%);
	}

	@keyframes shimmer {
		0% {
			left: -50px;
		}
		20% {
			left: 110%;
		}
		100% {
			left: 110%;
		}
	}
</style>