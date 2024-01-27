import { getLinkPreview, getPreviewFromContent } from "$lib/helper/LinkPreview";
import defaultSaves from '$lib/db/defaultSaves.json';
import { isImgUrl } from '$lib/utils';

export async function load({ setHeaders }) {
    
    async function getPreviewItems() {
        let previewData = [];
        return await new Promise(async (resolve, reject) => {
            try {
                for (const link of defaultSaves) {     
                    const data = await getLinkPreview(link);
                    previewData.push({
                        title: data?.title,
                        url: data?.url,
                        image: isImgUrl(data?.images[0] ?? '') ? data?.images[0] : undefined
                    })
                }
                resolve(previewData);       
            } catch (error) {
                console.log('getPreviewLink failed:', error);
                reject(error);
            }
        })
    }

    //TODO: cache headers not working
    setHeaders({
        // 'Cache-Control': `public, s-maxage=${60 * 60 * 24 * 365}`,
        // 'cache-control': `public, maxage=${60 * 60 * 24 * 365}`,
        // 'cache-control': `public, maxage=604800`, // one week
        'Cache-Control': 'public, max-age=0, s-maxage=604800'
    })

    return {
        previewData: getPreviewItems()
    }

}