import { browser } from 'wxt/browser';
import { CLICKED_KEY } from './image-context';
import type { ClickedImage } from './image-intent';

/** How many of the addresses of a picture are tried, the largest first, before the server is left to fetch it. */
const TRIES = 3;

/** A picture the page let us read. */
export type Picture = { address: string; blob: Blob };

/**
 * Asks the frame that was right-clicked about the picture and the page around it. Needs the permission the person
 * just gave by using the menu (activeTab). Null when the frame cannot be scripted or no picture of it goes by that
 * address.
 */
export async function lookAtImage(
    tabId: number,
    frameId: number,
    clicked: string,
): Promise<ClickedImage | null> {
    const target = { tabId, frameIds: [frameId] };

    try {
        // Both injections run in the same isolated world, so the script finds the address where it is left.
        await browser.scripting.executeScript({
            target,
            args: [CLICKED_KEY, clicked],
            func: (key: string, address: string): void => {
                (globalThis as Record<string, unknown>)[key] = address;
            },
        });
        const [injection] = await browser.scripting.executeScript({
            target,
            files: ['/clicked-image.js'],
        });

        return (injection?.result as ClickedImage | null | undefined) ?? null;
    } catch {
        return null;
    }
}

/**
 * The picture as bytes, fetched by the frame itself so a login or cookies it has still count: the first of the
 * addresses (best first) that gives a picture the API takes. Null when none does (another site's picture without
 * CORS); the address is saved then, and the server fetches it.
 */
export async function fetchImage(
    tabId: number,
    frameId: number,
    addresses: string[],
    limit: number,
): Promise<Picture | null> {
    try {
        const [injection] = await browser.scripting.executeScript({
            target: { tabId, frameIds: [frameId] },
            args: [addresses.slice(0, TRIES), limit],
            func: async (
                candidates: string[],
                max: number,
            ): Promise<{ address: string; dataUrl: string } | null> => {
                for (const address of candidates) {
                    // Cookies for the page's own site first; a CDN that answers "*" refuses a request with credentials.
                    for (const credentials of [
                        'same-origin',
                        'include',
                    ] as const) {
                        try {
                            const response = await fetch(address, {
                                credentials,
                            });
                            const blob = await response.blob();

                            if (
                                !response.ok ||
                                blob.size === 0 ||
                                (max > 0 && blob.size > max) ||
                                !/^image\/(?:jpeg|png|gif|webp|avif|heic|heif)$/.test(
                                    blob.type,
                                )
                            ) {
                                break;
                            }

                            return {
                                address,
                                dataUrl: await new Promise<string>(
                                    (resolve, reject) => {
                                        const reader = new FileReader();
                                        reader.onload = () =>
                                            resolve(reader.result as string);
                                        reader.onerror = () =>
                                            reject(reader.error);
                                        reader.readAsDataURL(blob);
                                    },
                                ),
                            };
                        } catch {
                            // Refused by CORS: the other way may pass.
                        }
                    }
                }

                return null;
            },
        });
        const found = injection?.result;

        return found === null || found === undefined
            ? null
            : {
                  address: found.address,
                  blob: await (await fetch(found.dataUrl)).blob(),
              };
    } catch {
        return null;
    }
}
