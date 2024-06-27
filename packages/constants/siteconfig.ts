export const siteConfig = {
	name: 'Stashlist',
	slogan: 'Your Creative Vault',
	appUrl: '/main',
	url: 'https://stashlist.app',
	fullAppUrl: 'https://stashlist.app/main',
	ogImage: 'https://stashlist.app/og.png',
	description: 'The creative vault for developers and designers.',
	keywords: `bookmarks, bookmark tool, code snippets, inspiration, stashlist, raindrop alternative, bookmark developers, raindrop developers`,
	extensionUrl: {
		chrome: 'https://chromewebstore.google.com/detail/flpkpkopodpmfiobdcdhffgphjibolka',
	}
} as const;

export type SiteConfig = typeof siteConfig;