export async function load({ setHeaders, fetch }) {

	async function getSaves() {
		try {
			const response = await fetch('/api/saves');
			if (!response.ok) {
				throw new Error(`Error getting saves. Status: ${response.status}`);
			}
			const saves = await response.json();
			return saves;
		} catch (error) {
			console.log('Error getting saves', error);
			return null;
		}
	}

	//TODO: cache headers not working
	setHeaders({
		// 'Cache-Control': `public, s-maxage=${60 * 60 * 24 * 365}`,
		// 'cache-control': `public, maxage=${60 * 60 * 24 * 365}`,
		// 'cache-control': `public, maxage=604800`, // one week
		'Cache-Control': 'public, max-age=0, s-maxage=604800'
	});

	return {
		previewData: getSaves()
	};
}
