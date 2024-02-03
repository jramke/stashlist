import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { save } from '$lib/server/db/schema';
import { generateId } from 'lucia';
import { json, redirect } from '@sveltejs/kit';
import urlMetadata from 'url-metadata';
import { getDomainFromUrl, isImageUrl, isAbsoluteUrl, makeAbsoluteUrl } from '$lib/utils';

export const POST: RequestHandler = async ({ request, locals, params, url }) => {
    if (!locals.user) redirect(302, '/login');
    const formData = await request.formData();
    const edit = url.searchParams.get('edit');
    
    const saveUrl = formData.get('url') as string;
    const metaData = await urlMetadata(saveUrl);  
    
    let faviconUrl = (metaData.favicons[0]?.href || '') as string;
    if (isImageUrl(faviconUrl) && !isAbsoluteUrl(faviconUrl)) {
        console.log(faviconUrl);
        faviconUrl = makeAbsoluteUrl(faviconUrl, getDomainFromUrl(saveUrl));
    }
    if (!faviconUrl) {
        // TODO: placeholder favicon
        faviconUrl = 'data:image/x-icon;base64,AAABAAEAEBAQAAEABAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAA/4QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAERERERERERERAAAAAAAAERAQAAAAAAEBEAEAAAAAEAEQABAAAAEAARAAAQAAEAABEAAAEAEAAAEQAAABEAAAARAAAAEQAAABEAAAEAEAAAEQAAEAABAAARAAEAAAAQABEAEAAAAAEAEQEAAAAAABAREAAAAAAAAREREREREREREAAAAAP/wAAF/6AABv9gAAd+4AAHveAAB9vgAAfn4AAH5+AAB9vgAAe94AAHfuAABv9gAAX/oAAD/8AAAAAAAA';
    }

    const imageUrl = metaData['og:image'];
    const description = metaData.description || '';
    const title = metaData.title || metaData.name || saveUrl;

    if (edit) {
        return json({
            url: saveUrl,
            title: title, 
            faviconUrl: faviconUrl
        })
    }

    await db.insert(save).values({
        id: generateId(15),
        userId: locals.user.id,
        url: saveUrl,
        faviconUrl: faviconUrl,
        title: title,
        description: description,
        imageUrl: imageUrl
    })

    return json({ success: true });
};
