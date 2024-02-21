import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		svelte(), 
		tsconfigPaths({ 
			loose: true, 
			root: '../../' 
		})
	],
	// resolve: {
	// 	alias: {
	// 		"@ui": "../../packages/ui/src",
	// 	}
	// },
	// optimizeDeps: {
	// 	include: ['@repo/ui']
	// },
	// build: {
	// 	commonjsOptions: {
	// 		include: [/@repo-ui/, /node_modules/]
	// 	}
	// }
})
