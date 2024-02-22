import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension from "@samrum/vite-plugin-web-extension";
import { getManifest } from "./src/manifest";
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      svelte(),
      webExtension({
        manifest: getManifest(Number(env.MANIFEST_VERSION))
      }),
      tsconfigPaths({ 
        loose: true, 
        root: '../../' 
      })
    ],
  };
});