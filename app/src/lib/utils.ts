import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

export function isImageUrl(url: string): boolean {
    // Include query parameter support by adding \?.* after the file extension
    return /\.(jpg|jpeg|png|webp|avif|gif|svg|ico)(\?.*)?$/i.test(url);
}

export function isAbsoluteUrl(url: string): boolean {
    return /^(https?:\/\/|\/\/)/.test(url);
}

export function isRelativeUrl(url: string): boolean {
    // Check if the URL does not start with a protocol and may contain query parameters
    return !/^[a-zA-Z]+:\/\//.test(url) && /\//.test(url);
}

export function makeAbsoluteUrl(relativeUrl: string, baseDomain: string): string {
    try {
        const baseURL = baseDomain.endsWith("/") ? baseDomain : baseDomain + "/";
        const absoluteURL = new URL(relativeUrl, baseURL).href;
        return absoluteURL;
    } catch (error) {
        console.error(`Error while creating absolute URL: ${error}`);
        return relativeUrl; // Return the original URL in case of an error
    }
}

export function cleanUrl(url: string): string {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

export function getDomainFromUrl(url: string): string {
    try {
        const urlObject = new URL(url);
        return urlObject.origin + '/';
    } catch (error) {
        return '';
    }
}

export function slugify(str: string): string {
	return String(str)
	  .normalize('NFKD') // split accented characters into their base characters and diacritical marks
	  .replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
	  .trim() // trim leading or trailing whitespace
	  .toLowerCase() // convert to lowercase
	  .replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
	  .replace(/\s+/g, '-') // replace spaces with hyphens
	  .replace(/-+/g, '-'); // remove consecutive hyphens
  }

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type FlyAndScaleParams = {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
};

export const flyAndScale = (
	node: Element,
	params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig => {
	const style = getComputedStyle(node);
	const transform = style.transform === 'none' ? '' : style.transform;

	const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	const styleToString = (style: Record<string, number | string | undefined>): string => {
		return Object.keys(style).reduce((str, key) => {
			if (style[key] === undefined) return str;
			return str + `${key}:${style[key]};`;
		}, '');
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t
			});
		},
		easing: cubicOut
	};
};
