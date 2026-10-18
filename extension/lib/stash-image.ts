import { fetchImage, lookAtImage } from './image';
import { decideImage, isApiAddress } from './image-intent';
import { connect, NotStashable, stashTab, stashThing } from './stash-tab';
import type { SaveRequest, SaveResult } from './types';

/** The most the API takes as a picture. */
const IMAGE_LIMIT = 20 * 1024 * 1024;

export type StashedImage = {
    result: SaveResult;
    /** The page was stashed with the picture as its picture (false: the picture itself was stashed). */
    page: boolean;
};

/**
 * "Stash image": looks at the picture the person right-clicked and at the page around it, then stashes either the
 * page with this picture or the picture alone (`decideImage` has the rule). The picture is read by the page itself
 * where it can, so a login still counts; otherwise its address is saved and the server fetches it.
 */
export async function stashImage(
    tab: {
        id?: number | undefined;
        url?: string | undefined;
        title?: string | undefined;
        windowId?: number | undefined;
    },
    click: { srcUrl: string; frameId?: number | undefined },
): Promise<StashedImage> {
    // Not set up yet: say so before anything is read.
    await connect();

    const frameId = click.frameId ?? 0;
    const image =
        tab.id === undefined
            ? null
            : await lookAtImage(tab.id, frameId, click.srcUrl);
    const intent = decideImage({
        page: tab.url ?? '',
        clicked: click.srcUrl,
        inPage: frameId === 0,
        image,
    });
    const picture =
        tab.id === undefined
            ? null
            : await fetchImage(tab.id, frameId, intent.addresses, IMAGE_LIMIT);
    // What the server can fetch if it has to: an address on the web, the one the bytes came from first.
    const address =
        [picture?.address, ...intent.addresses].find(
            (candidate): candidate is string =>
                candidate !== undefined && isApiAddress(candidate),
        ) ?? null;

    if (intent.kind === 'page') {
        return {
            result: await stashTab(tab, {
                address,
                blob: picture?.blob ?? null,
            }),
            page: true,
        };
    }

    if (picture === null && address === null) {
        throw new NotStashable('image');
    }

    const request: SaveRequest = { type: 'image' };

    if (intent.title !== null) request.title = intent.title;
    if (intent.source !== null) request.sourceUrl = intent.source;

    if (picture !== null) {
        request.image = picture.blob;
    } else if (address !== null) {
        request.url = address;
    }

    return { result: await stashThing(request), page: false };
}
