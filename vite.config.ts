import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        inertia(),
        react(),
        // scripts/check-compiler.mjs runs this compiler over the sources (`npm run check`) and fails when it skips a
        // function, which the build never reports. Keep its options in step with these.
        babel({
            presets: [reactCompilerPreset()],
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
    server: {
        watch: {
            ignored: ['**/.claude/**', '**/vendor/**'],
        },
        host: '0.0.0.0',
        origin: `https://vite.${process?.env?.DDEV_PRIMARY_URL?.replace('https://', '')}`,
        cors: {
            origin: /^https?:\/\/(?:.*\.ddev\.site|.*\.dev)(?::\d+)?$/,
        },
    },
});
