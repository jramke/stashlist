import type { RequestHandler } from './$types';

import { error, json, redirect } from '@sveltejs/kit';
import { isImageUrl, isAbsoluteUrl, isValidCssColor } from '$lib/utils';

const typeEndpointMap = {
    image: '/api/saves/new/image',
    website: '/api/saves/new/website',
    text: '/api/saves/new/text',
    color: '/api/saves/new/color',
};

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
	if (!locals.user) redirect(302, '/login');
	
	try {
		const data = await request.json();

        const input = data['input'];
        if (!input) throw Error('No input provided.');

        const groups = data['groups'] || '';

        let response;        

        const typeConditions = [
            { 
                check: isAbsoluteUrl(input) && await isImageUrl(input), 
                endpoint: typeEndpointMap['image'], 
                body: { imageUrl: input, groups: groups } 
            },
            { 
                check: isAbsoluteUrl(input), 
                endpoint: typeEndpointMap['website'], 
                body: { url: input, groups: groups } 
            },
            { 
                check: isValidCssColor(input), 
                endpoint: typeEndpointMap['color'], 
                body: { text: input, groups: groups } 
            },
            { 
                check: true, 
                endpoint: typeEndpointMap['text'], 
                body: { text: input, groups: groups } 
            },
        ];

        const condition = typeConditions.find(condition => condition.check);

        if (!condition) throw Error('No valid type condition found.');

        response = await fetch(condition.endpoint, {
            method: 'POST',
            body: JSON.stringify(condition.body),
        }); 

        if (!response.ok) {
            throw Error(`Error creating save. Status: ${response.status}`);
        }

		return json({ success: true });

	} catch (err) {
		console.log('error create universal save', err);
		return error(400, {
			message: 'Failed to create universal save'
		});
	}
	
};