import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		commonjsOptions: {
		//   include: [/@repo-ui/, /node_modules/],
		  	include: [/@ui/, /@repo-ui/, /node_modules/],
		},
	},
	server: {
		fs: {
			// Allow serving files from two level up to the project root
			allow: ['../..'],
		},
	}
});
