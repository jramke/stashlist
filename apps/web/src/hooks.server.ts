import { siteConfig } from '@repo/constants';
import { lucia } from '$lib/server/auth';
import { getUserByApiKey, getSessionByUserId } from '$lib/server/db/queries';
import { redirect, error, json, text, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const allowedPaths = [
		'/api/saves/new/website',
		'/api/saves/new/image',
		'/api/saves',
		'/api/groups'
	];

	// https://github.com/sveltejs/kit/issues/6784
	const forbidden =
		event.request.method === 'POST' &&
		event.request.headers.get('origin') !== event.url.origin &&
		isFormContentType(event.request) &&
		!allowedPaths.includes(event.url.pathname);

	if (forbidden) {
		const csrfError = error(
			403,
			`Cross-site ${event.request.method} form submissions are forbidden`,
		);
		if (event.request.headers.get('accept') === 'application/json') {
			return json(csrfError.body, { status: csrfError.status });
		}
		return text(csrfError.body.message, { status: csrfError.status });
	}

	const requestPath = event.url.pathname;
	const isRequestToApi = requestPath.startsWith('/api');
	const declineApiRequests = () => {
		if (!isRequestToApi) return;
		if (allowedPaths.includes(requestPath)) {
			error(401, 'You are not authorized. Please log in.');
		} else {
			error(404, 'Not found');
		}
	};

	let sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		const fullUser = await getUserFromApiKeyHeader(event.request);
		console.log('user id from api key', fullUser?.id);
		const session = await getSessionByUserId(fullUser?.id);
		console.log('session from user id', session);
		
		if (session && session.id) {
			sessionId = session.id;
		} else {
			event.locals.user = null;
			event.locals.session = null;
			declineApiRequests();
			return await resolve(event);
		}
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
		if (event.url.pathname === '/' && !event.url.searchParams.has('homepage')) {
			redirect(302, siteConfig.appUrl);
		}
	}
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
		declineApiRequests();
		if (event.url.pathname.startsWith(siteConfig.appUrl)) {
			redirect(302, '/login');
		}
	}

	event.locals.user = user;
	event.locals.session = session;

	const response = await resolve(event);

	return response;
};


function isContentType(request: Request, ...types: string[]) {
	const type = request.headers.get('content-type')?.split(';', 1)[0].trim() ?? '';
	return types.includes(type);
}
function isFormContentType(request: Request) {
	return isContentType(request, 'application/x-www-form-urlencoded', 'multipart/form-data');
}
async function getUserFromApiKeyHeader(request: Request) {
	console.log(request.headers);
	const apiKey = request.headers.get('x-api-key');
	if (!apiKey) {
		return null;
	}

	const user = await getUserByApiKey(apiKey);
	if (!user) {
		return null;
	}

	return user;
}