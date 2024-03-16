import { siteConfig } from '$lib/config/site';
import { lucia } from '$lib/server/auth';
import { redirect, error, json, text, type Handle } from '@sveltejs/kit';
import { CHROME_EXTENSION_ID, CHROME_EXTENSION_ID_DEV } from "$env/static/private";

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
		if (event.url.pathname.startsWith(siteConfig.appUrl)) {
			redirect(302, '/login');
		}
	}

	event.locals.user = user;
	event.locals.session = session;

	// return await resolve(event);

	// handle cors
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

	// const response = await resolve(event);
	// if (event.url.pathname.startsWith('/api')) {
	// 	response.headers.append('Access-Control-Allow-Origin', `*`);
	// }
	const chromeId = import.meta.env.DEV ? CHROME_EXTENSION_ID_DEV : CHROME_EXTENSION_ID;
	const allowedOrigins = [
		`chrome-extension://${chromeId}`,
		// 'moz-extension://YOUR_FIREFOX_EXTENSION_ID'
	];
	const allowedPaths = [
		'/api/saves/new/website',
		'/api/saves/new/image',
	];
	const origin = event.request.headers.get('origin') || '';
	const forbidden = event.request.method === 'POST' && origin !== event.url.origin && !(allowedOrigins.includes(origin) && allowedPaths.includes(event.url.pathname));

	if (forbidden) {
		const csrfError = error(
			403,
			`Cross-site ${event.request.method} requests are forbidden from ${origin} to ${event.url.origin}`,
		);
		if (event.request.headers.get('accept') === 'application/json') {
			return json(csrfError.body, { status: csrfError.status });
		}
		return text(csrfError.body.message, { status: csrfError.status });
	}

	const response = await resolve(event);

	return response;
};
