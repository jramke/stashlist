import type { Actions, PageServerLoad } from './$types';

import { fail, redirect } from '@sveltejs/kit';
import { ANALYTICS_PASSWORD } from '$env/static/private';


export const load: PageServerLoad = async ({ cookies, fetch }) => {
    const analyticsSession = cookies.get('analytics_session');
    
    async function getPageViews() {
        try {
            const response = await fetch('/api/analytics');
            const result = response.json();
            return result; 
        } catch (error) {
            console.error('Error getting page views data: ', error);
        }
    }
    
    // TODO: maybe use hash
    if (analyticsSession === ANALYTICS_PASSWORD) {
        return { analytics: getPageViews() }
    }

    return {
        loggedIn: false
    }
}

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const password = data.get('password') as string;

        console.log(password);
        

        if (!password) {
            return fail(400, { password, missing: true });
        }

        //TODO: maybe use hash
        const validPassword = (ANALYTICS_PASSWORD === password);
        console.log(validPassword);
        

        cookies.set('analytics_session', ANALYTICS_PASSWORD, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            secure: import.meta.env.PROD,
            maxAge: 60 * 60 * 24 * 30 // 1 month
        });


        if (!validPassword) {
            return fail(400, { password, incorrect: true });
        }

        return redirect(302, '/analytics');
        return { success: true };
    }   
};