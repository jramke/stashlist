import type { RequestHandler } from './$types';
import { error, json, redirect } from '@sveltejs/kit';
import urlMetadata from 'url-metadata';
import { getDomainFromUrl, isImageUrl, isAbsoluteUrl, makeAbsoluteUrl } from '$lib/utils';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
    if (!locals.user) return redirect(302, '/login');

    try {
        const data = await request.json();
        const saveUrl = data['url'] as string;

        if (!saveUrl) {
            return error(400, 'Invalid URL');
        }

        if (saveUrl.includes('x.com') || saveUrl.includes('twitter.com')) {
            return await handleTweetUrl(saveUrl, fetch);
        } else {
            return await handleGenericUrl(saveUrl, fetch);
        }
    } catch (err) {
        console.error('Error fetching metadata', err);
        throw error(400, 'Failed to fetch metadata');
    }
};

// logic from https://github.com/vercel/react-tweet/blob/7eeac390fdbd95c3ad6c84e845479f4b0eac8190/packages/react-tweet/src/api/fetch-tweet.ts
async function handleTweetUrl(saveUrl: string, fetch: typeof globalThis.fetch) {
    const SYNDICATION_URL = 'https://cdn.syndication.twimg.com';
    const TWEET_ID_REGEX = /^[0-9]+$/;

    const tweetId = extractTweetId(saveUrl);
    if (!tweetId || !TWEET_ID_REGEX.test(tweetId) || tweetId.length > 40) {
        throw error(400, 'Invalid tweet URL');
    }

    const apiUrl = new URL(`${SYNDICATION_URL}/tweet-result`);
    apiUrl.searchParams.set('id', tweetId);
    apiUrl.searchParams.set('token', getToken(tweetId));

    const res = await fetch(apiUrl.toString());
    if (!res.ok) {
        throw error(res.status, 'Failed to fetch tweet metadata');
    }

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const tweetData = isJson ? await res.json() : undefined;

    const imageUrl = tweetData?.photos?.[0]?.url || tweetData?.video?.poster ||  '';
    const description = tweetData?.text || '';
    const title = tweetData?.user?.name ? `${tweetData.user.name} - ${description.substring(0, 20)}...` : '';
    const faviconUrl = tweetData?.user?.profile_image_url_https || '';

    return json({ faviconUrl, imageUrl, description, title });
}

async function handleGenericUrl(saveUrl: string, fetch: typeof globalThis.fetch) {
    const saveUrlResponse = await fetch(saveUrl);
    if (!saveUrlResponse.ok) {
        throw error(saveUrlResponse.status, 'Failed to fetch URL');
    }

    const metaData = await urlMetadata(null, { parseResponseObject: saveUrlResponse });
    let faviconUrl = metaData?.favicons?.[0]?.href || '';

    if (await isImageUrl(faviconUrl) && !isAbsoluteUrl(faviconUrl)) {
        faviconUrl = makeAbsoluteUrl(faviconUrl, getDomainFromUrl(saveUrl));
    }

    const imageUrl = metaData?.['og:image'] || '';
    const description = metaData?.description || '';
    const title = metaData?.title || metaData?.name || saveUrl;

    return json({ faviconUrl, imageUrl, description, title });
}

function getToken(id: string): string {
    return ((Number(id) / 1e15) * Math.PI)
        .toString(36)
        .replace(/(0+|\.)/g, '');
}

function extractTweetId(url: string): string | null {
    const regex = /https?:\/\/(?:www\.)?(x|twitter)\.com\/[^\/]+\/status\/(\d+)/;
    const match = url.match(regex);
    return match ? match[2] : null;
}