import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension from "@samrum/vite-plugin-web-extension";
import path from "path";
import { getManifest } from "./src/manifest";
import { fileURLToPath, URL } from "url";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      svelte(),
      webExtension({
        manifest: getManifest(Number(env.MANIFEST_VERSION))
      }),
    ],
    build: {
      commonjsOptions: {
      //   include: [/@repo-ui/, /node_modules/],
        include: [/@ui/, /@repo-ui/, /node_modules/],
      },
      rollupOptions: {
        external: [/@ui/, /@repo-ui/, /node_modules/],
      }
    },
    server: {
      fs: {
        // Allow serving files from two level up to the project root
        allow: ['../..'],
      },
    },
    resolve: {
      // alias: [
      //   { find: '@ui', replacement: fileURLToPath(new URL('../../packages/ui/src', import.meta.url)) }
      // ]
      alias: {
        '@': path.resolve(__dirname, 'src'),
        "@ui":  path.resolve(__dirname, "../../packages/ui/src"),
        // "@ui": new URL('../../packages/ui/src', import.meta.url).pathname
        // ...alias,
      },
    },
  };
});
