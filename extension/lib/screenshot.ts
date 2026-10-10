import { browser } from 'wxt/browser';

const MAX_WIDTH = 1280;

/**
 * A picture of the part of the page that is visible, as WebP, small enough for the API. Null when the browser
 * does not allow it (a page it keeps to itself) or the picture would be too large.
 */
export async function captureScreenshot(
    windowId: number | undefined,
    maxBytes: number,
): Promise<Blob | null> {
    try {
        const dataUrl = await browser.tabs.captureVisibleTab(
            windowId ?? browser.windows.WINDOW_ID_CURRENT,
            {
                format: 'png',
            },
        );
        const source = await (await fetch(dataUrl)).blob();
        const bitmap = await createImageBitmap(source);

        const scale = Math.min(1, MAX_WIDTH / bitmap.width);
        const canvas = new OffscreenCanvas(
            Math.round(bitmap.width * scale),
            Math.round(bitmap.height * scale),
        );
        canvas
            .getContext('2d')
            ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        const blob = await canvas.convertToBlob({
            type: 'image/webp',
            quality: 0.8,
        });

        return blob.size <= maxBytes ? blob : null;
    } catch {
        return null;
    }
}
