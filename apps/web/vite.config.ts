import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		commonjsOptions: {
		//   include: [/@repo-ui/, /node_modules/],
		  include: [/@ui/, /node_modules/],
		},
	},
});
