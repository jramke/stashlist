import { google, lucia } from "$lib/server/auth";
import { OAuth2RequestError } from "arctic";
import { generateId } from "lucia";

import { redirect, type RequestEvent } from "@sveltejs/kit";
import { createUser, getUserByProvider } from "$lib/server/db/queries";

export async function GET(event: RequestEvent): Promise<Response> {
	const code = event.url.searchParams.get("code");
	const state = event.url.searchParams.get("state");

	const storedState = event.cookies.get('google_oauth_state');
	const storedCodeVerifier = event.cookies.get('google_oauth_code_verifier');
	
	if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {	
		redirect(307, "/login?error=true");
	}

	try {
		const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);
		const googleUserResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: {
				Authorization: `Bearer ${tokens.accessToken}`
			}
		});
		const googleUser: GoogleUser = await googleUserResponse.json();
		
		const existingUser = await getUserByProvider('google', googleUser.sub);

		if (existingUser) {
			const session = await lucia.createSession(existingUser.userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: ".",
				...sessionCookie.attributes
			});
		} else {
			const userId = generateId(15);
			await createUser('google', googleUser.sub, userId, googleUser.name, googleUser.given_name, googleUser.picture);

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: ".",
				...sessionCookie.attributes
			});
		}
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/"
			}
		});
	} catch (e) {
		console.error('Error during Google callback: ', e);
		
		if (e instanceof OAuth2RequestError && e.message === "bad_verification_code") {
			// invalid code
			return new Response(null, {
				status: 400
			});
		}
		return new Response(null, {
			status: 500
		});
	}
}

type GoogleUser = {
	sub: string;
	name: string;
	given_name: string;
	picture: string;
};