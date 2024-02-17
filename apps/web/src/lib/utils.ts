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