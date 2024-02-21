import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [
		sveltekit(),
		tsconfigPaths({ 
			loose: true, 
			root: '../../' 
		})
	],
	// build: {
	// 	commonjsOptions: {
	// 	//   include: [/@repo-ui/, /node_modules/],
	// 	  	include: [/@ui/, /@repo-ui/, /node_modules/],
	// 	},
	// },
	// server: {
	// 	fs: {
	// 		// Allow serving files from two level up to the project root
	// 		allow: ['../..'],
	// 	},
	// }
});
