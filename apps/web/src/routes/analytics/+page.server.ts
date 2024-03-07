import type { Actions } from './$types';

import { fail } from '@sveltejs/kit';
import { ANALYTICS_PASSWORD } from '$env/static/private';

export const actions: Actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const password = data.get('password') as string;

        console.log(password);
        

        if (!password) {
            return fail(400, { password, missing: true });
        }

        const validPassword = (ANALYTICS_PASSWORD === password);
        console.log(validPassword);
        

        //TODO: store auth in header or something
        // no cookies, so we dont need a cookie layer cause of this

        if (!validPassword) {
            return fail(400, { password, incorrect: true });
        }

        return { success: true };
    }   
};