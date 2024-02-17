import { siteConfig } from '$lib/config/site';
import { lucia } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return await resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session) {
		if (session.fresh) {
			const sessionCookie = lucia.createSessionCookie(session.id);
			// sveltekit types deviates from the de-facto standard
			// you can use 'as any' too
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		}
		// redirect to app when logged in and on home page
		if (event.url.pathname === '/') {
			redirect(302, siteConfig.appUrl);
		}
	}
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
		if (event.url.pathname.startsWith('/app')) {
			redirect(302, '/login');
		}
	}

	event.locals.user = user;
	event.locals.session = session;

	// return await resolve(event);

	// // handle cors
	// // TODO: tighten before prod
	// // https://snippets.khromov.se/configure-cors-in-sveltekit-to-access-your-api-routes-from-a-different-host/
	// // TODO: check if this check is better https://github.com/sveltejs/kit/issues/6784#issuecomment-1416104897
	// if (event.url.pathname.startsWith('/api')) {
	// 	// Required for CORS to work
	// 	if (event.request.method === 'OPTIONS') {
	// 		return new Response(null, {
	// 			headers: {
	// 				'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
	// 				'Access-Control-Allow-Origin': '*',
	// 				'Access-Control-Allow-Headers': '*'
	// 			}
	// 		});
	// 	}
	// }

	const response = await resolve(event);
	if (event.url.pathname.startsWith('/api')) {
		response.headers.append('Access-Control-Allow-Origin', `*`);
	}

	return response;
};
