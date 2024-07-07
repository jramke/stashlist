<script lang="ts">
	import { Motion } from "svelte-motion";
    import { cn } from "@repo/ui/utils";
	import { LogoPoof } from "../logos";
	import { getHeroContext } from "./context";

    let className: string | undefined | null = undefined;
	export { className as class };

    export let x = 0;
    export let y = 0;

    let scale = 1;
    let opacity = 1;

    const DURATION = 0.4;

    const { animateShimmer } = getHeroContext();

    const getRandomTransformOrigin = () => {
        const value = (16 + 40 * Math.random()) / 100;
        const value2 = (15 + 36 * Math.random()) / 100;
        return {
            originX: value,
            originY: value2
        };
    };

    const getRandomDelay = () => -(Math.random() * 0.7 + 2);

    const randomDuration = () => Math.random() * 0.7 + 2;

    const persistentRandom = Math.random();

    const poofCallback = () => {
        x = 0;
        y = 0;
        scale = 0;
        opacity = 0;
        setTimeout(() => {
            animateShimmer();
        }, DURATION * 1000);
    };

</script>

<Motion 
    let:motion
    initial={{ x, y }}
    animate={{ x, y, scale, opacity }}
    transition={{ duration: DURATION, ease: 'backIn' }}
>
    <div use:motion class={cn("absolute size-10", className)}>
        <Motion 
            let:motion={motionFloat} 
            style={{ ...getRandomTransformOrigin() }}
            initial={{ 
                rotate: persistentRandom > 0.5 ? -2 : 2, 
                // scale: persistentRandom > 0.5 ? 1 : 1.2,
                translateY: 0 
            }}
            animate={{ 
                rotate: persistentRandom > 0.5 ? [-2, 5] : [2, -4],
                scale: Math.random() > 0.5 ? [1, 1.05] : [1, 1.1],
                translateY: [0, -5],
                translateX: Math.random() > 0.5 ? [0, 3] : [0, -3]
            }}
            transition={{ duration: randomDuration(), delay: getRandomDelay(), repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        >
            <div use:motionFloat>
                <LogoPoof replacerLogoClass="size-10" poofClass="size-24" {poofCallback}>
                    <slot />
                </LogoPoof>
            </div>
        </Motion>
    </div>
</Motion>