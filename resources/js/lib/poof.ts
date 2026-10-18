import type { Rive } from '@rive-app/canvas-lite';

/** The poof animation: the Rive runtime and the file, loaded once and shared by every logo that puffs. */
export type Poof = {
    Rive: typeof Rive;
    buffer: ArrayBuffer;
};

let loading: Promise<Poof | null> | null = null;

/**
 * Fetches the runtime (its WebAssembly is served from here, not from a CDN, so no visitor is shown to a third
 * party) and the animation. Resolves to null when anything fails; the logos then puff with plain CSS.
 */
export function loadPoof(): Promise<Poof | null> {
    loading ??= (async () => {
        try {
            const [rive, wasm, file] = await Promise.all([
                import('@rive-app/canvas-lite'),
                import('@rive-app/canvas-lite/rive.wasm?url'),
                fetch('/static/poof.riv'),
            ]);

            if (!file.ok) {
                return null;
            }

            rive.RuntimeLoader.setWasmUrl(wasm.default);

            return { Rive: rive.Rive, buffer: await file.arrayBuffer() };
        } catch {
            return null;
        }
    })();

    return loading;
}

/** Starts loading when the browser has a moment, or at once when a hand comes near. */
export function warmPoof(): void {
    void loadPoof();
}
