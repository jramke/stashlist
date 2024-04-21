import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import * as dotenv from 'dotenv';
dotenv.config();

const { DEV } = process.env;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: [vitePreprocess({})],

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			regions: ['fra1']
		}),
		csrf: {
			// handled manually in hooks // https://github.com/sveltejs/kit/issues/6784
			// checkOrigin: +DEV ? false : true 
			checkOrigin: false,
		},
		alias: {
			'$routes': './src/routes',
		}
	}
};

export default config;
