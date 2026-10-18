import { CLICKED_KEY, readClickedImage } from '@/lib/image-context';

// Injected on demand into the frame that was right-clicked, like capture.ts: nothing is read until the person uses
// "Stash image". The background leaves the address of the picture on the global first (lib/image.ts). The value
// this returns is what scripting.executeScript hands back.
export default defineUnlistedScript(() => {
    const clicked = (globalThis as Record<string, unknown>)[CLICKED_KEY];

    return typeof clicked === 'string'
        ? readClickedImage(document, window, clicked)
        : null;
});
