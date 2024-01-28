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

	return await resolve(event);
};
