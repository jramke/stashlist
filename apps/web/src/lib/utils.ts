export function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffInMilliseconds = date.getTime() - now.getTime();

	// Define units for different time intervals
	const units: { unit: Intl.RelativeTimeFormatUnit; value: number }[] = [
		{ unit: 'year', value: 365 * 24 * 60 * 60 * 1000 },
		{ unit: 'month', value: 30 * 24 * 60 * 60 * 1000 },
		{ unit: 'day', value: 24 * 60 * 60 * 1000 },
		{ unit: 'hour', value: 60 * 60 * 1000 },
		{ unit: 'minute', value: 60 * 1000 }
	];

	// Find the appropriate unit and value
	for (const { unit, value } of units) {
		const unitCount = Math.round(Math.abs(diffInMilliseconds) / value);
		if (unitCount >= 1) {
			const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
			const relativeTime = formatter.format(Math.sign(diffInMilliseconds) * unitCount, unit);
			return relativeTime;
		}
	}

	// If the date is less than a minute ago or in the future
	return 'just now';
}

export async function isImageUrl(url: string) {
	try {
		const res = await fetch(url, {method: 'HEAD'});
		const contentType = res.headers.get('Content-Type');
		
		if (!contentType) return false;
		
		return contentType.startsWith('image');
		
	} catch (error) {
		console.error(`Error while checking if URL is an image, falling back to regex: ${error}`);
		return /\.(jpg|jpeg|png|webp|avif|gif|svg|ico)(\?.*)?$/i.test(url);
	}
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
		const baseURL = baseDomain.endsWith('/') ? baseDomain : baseDomain + '/';
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

export function setHeightOfElementAsVariable(element: HTMLElement | null, variableName: string): void {
	if (!element) {
		return;
	}
	const height = element.clientHeight;
	document.documentElement.style.setProperty(variableName, `${height}px`);
}

export function getRandomIndex<T>(array: readonly T[] = []): number {
	if (array.length === 0) {
        throw new Error("Array is empty");
    }
    return Math.floor(Math.random() * array.length);
}

export async function minDelay(startTimestamp: number, minDelayMs: number = 500) {
	const elapsedTime = Date.now() - startTimestamp;
	return new Promise<void>(resolve => {
		if (elapsedTime > minDelayMs) {
			resolve();
		};
		setTimeout(resolve, minDelayMs - elapsedTime);
	});
}

// get middle number in range
// return -1 if not possible
// returns whole numbers if possible and only if not possible returns decimal
export function findMiddleNumberInRange(min: number, max: number): number {
	if (min === max) {
		return -1 
	}
	const middle = (min + max) / 2;
    if (middle % 1 === 0) {
        return middle;
    } else {
        const roundedMiddle = Math.round(middle);
        if (roundedMiddle > min && roundedMiddle < max) {
            return roundedMiddle;
        } else {
            return middle;
        }
    }
}

export function memoize(func: (...args: any[]) => any) {
    const cache = new Map();
    return function (...args: any[]) {
        const key = JSON.stringify(args);
        if (!cache.has(key)) {
            cache.set(key, func(...args));
        }
        return cache.get(key);
    };
}

export function isValidCssColor(color: string): boolean {
	const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
	const rgbColorRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
	const rgbaColorRegex = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(\.\d+)?|1(\.0+)?)\s*\)$/;
	const hslColorRegex = /^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/;
	const hslaColorRegex = /^hsla\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*(0(\.\d+)?|1(\.0+)?)\s*\)$/;
	const oklchColorRegex = /^oklch\(\s*((0|1)(\.\d+)?|0|1)\s*,\s*(\d+(\.\d+)?)%\s*,\s*(\d+(\.\d+)?)\s*\)$/;

	const namedColors = new Set([
		"aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", 
		"cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", 
		"darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", 
		"darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", 
		"forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred", 
		"indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", 
		"lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", 
		"lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", 
		"mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", 
		"oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", 
		"peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", 
		"sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", 
		"violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen"
	]);

	return (
		hexColorRegex.test(color) ||
		rgbColorRegex.test(color) ||
		rgbaColorRegex.test(color) ||
		hslColorRegex.test(color) ||
		hslaColorRegex.test(color) ||
		oklchColorRegex.test(color) ||
		namedColors.has(color.toLowerCase())
	);
}