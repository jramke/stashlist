const osInfos = {
	'windows': { 
		label: 'for Windows', 
		pattern: /Windows NT/, 
		filename: 'x64-setup.exe'
	},
	'mac-intel': { 
		label: 'for Mac (Intel)', 
		pattern: /Mac OS X.*Intel/, 
		filename: 'x64.dmg' 
	},
	'mac-arm': { 
		label: 'for Mac (M1/M2)', 
		pattern: /Mac OS X.*ARM|AppleWebKit/, 
		filename: 'arm64.dmg' 
	},
	'linux': { 
		label: 'for Linux', 
		pattern: /Linux/, 
		filename: 'x64.AppImage' 
	},
} as const;

type OsKey = keyof typeof osInfos;

export type Release = { url: string, label: string };

export function getOS(userAgent: string|null): OsKey | 'other' {
	if (!userAgent) {
		userAgent = window.navigator.userAgent;
	}

	for (const key of Object.keys(osInfos) as OsKey[]) {
		if (osInfos[key].pattern.test(userAgent)) {
			return key;
		};
	}

	return 'other';
};

export async function getLatestReleases(repo: string, userAgent: string|null = null) {
	const fallbackUrl = `https://github.com/${repo}/releases/latest`;
	const os = getOS(userAgent);
	
	const fallback = {
		url: fallbackUrl,
		label: 'for your OS',
	};

	let releases: Partial<Record<OsKey|'other', Release & { current?: boolean }>> = {};

	try {
		const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
		if (!res.ok) {
			throw new Error(res.statusText);
		}
		const data = await res.json();
		const assets = data.assets;
		
		assets.map((asset: {browser_download_url: string}) => {
			for (const key of Object.keys(osInfos) as OsKey[]) {
				console.log(key);
				
				const info = osInfos[key];
				if (asset.browser_download_url.includes(info.filename)) {
					releases[key] = { url: asset.browser_download_url, label: info.label };
					if (os === key) {
						releases[key].current = true;
					}
				}
			}
		});

		releases['other'] = fallback;

	} catch (error) {
		console.error(error);
		releases = { 'other': fallback };
	}

	return releases;
}

export function getLatestReleaseByOS(
	repo: string, userAgent: string|null = null
): { fallback: Release, release: Promise<Release> } {
	const os = getOS(userAgent);
	const fallbackUrl = `https://github.com/${repo}/releases/latest`;
	
	const fallback = {
		url: fallbackUrl,
		label: 'for your OS',
	};

	const release = new Promise<Release>(async (resolve) => {
		if (os === 'other') {
			resolve(fallback);
			return;
		}

		const info = osInfos[os];
		let latestDownloadUrl = '';
	
		try {
			const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
			const data = await res.json();
			const assets = data.assets;
			
			const asset = assets.find((asset: {browser_download_url: string}) => {
				return asset.browser_download_url.includes(info.filename)
			});
			if (asset) {
				latestDownloadUrl = asset.browser_download_url;
			}
		} catch (error) {
			console.error(error);
			latestDownloadUrl = fallback.url;
		}

		resolve({ url: latestDownloadUrl, label: info.label });
	});


	return {
		fallback,
		release,
	}
}