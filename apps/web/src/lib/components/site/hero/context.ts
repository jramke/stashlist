import { getContext, setContext } from 'svelte';
import { animate, motionValue, useMotionTemplate } from 'svelte-motion';
import { get, writable } from 'svelte/store';

let widthPercentageNumber = motionValue(0);
let widthPercentage = useMotionTemplate`${widthPercentageNumber}%`;
let isMouseOver = writable(false);
let manuallyAnimating = writable(false);

function animateShimmer() {
    manuallyAnimating.set(true);
    let start;
    let end;
    
    if (widthPercentageNumber.get() > 30) {
        start = widthPercentageNumber.get();
        end = -50;
    } else {
        start = widthPercentageNumber.get();
        end = 120;
    }
    isMouseOver.set(true);
    widthPercentageNumber.set(start);
    animate(widthPercentageNumber, end, { duration: 0.5, onComplete: () => {
        isMouseOver.set(false);
        manuallyAnimating.set(false);
    }});
}

const HERO_KEY = Symbol('Hero');

export function setHeroContext() {
    return setContext(HERO_KEY, {
        widthPercentage,
        widthPercentageNumber,
        isMouseOver,
        manuallyAnimating,
        animateShimmer,
    });
}

export function getHeroContext() {
    return getContext<ReturnType<typeof setHeroContext>>(HERO_KEY);
}