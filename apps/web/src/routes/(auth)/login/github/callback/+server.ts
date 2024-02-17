import { github, lucia } from "$lib/server/auth";
import { OAuth2RequestError } from "arctic";
import { generateId } from "lucia";
import { db } from "$lib/server/db";
import { and, eq } from "drizzle-orm";
import { user, oauth_account } from '$lib/server/db/schema';

import type { RequestEvent } from "@sveltejs/kit";

export async function GET(event: RequestEvent): Promise<Response> {
	const code = event.url.searchParams.get("code");
	const state = event.url.searchParams.get("state");
	const storedState = event.cookies.get("github_oauth_state") ?? null;
	
	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, {
			status: 400
		});
	}

	try {
		const tokens = await github.validateAuthorizationCode(code);
		const githubUserResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${tokens.accessToken}`
			}
		});
		const githubUser: GitHubUser = await githubUserResponse.json();
		
		const existingUser = await db.query.oauth_account.findFirst({
			where: and(eq(oauth_account.provider, 'github'), eq(oauth_account.providerId, githubUser.id))
		});

		if (existingUser) {
			const session = await lucia.createSession(existingUser.userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: ".",
				...sessionCookie.attributes
			});
		} else {
			const userId = generateId(15);

            await db.insert(user).values({
                id: userId,
                username: githubUser.login,
				name: githubUser.name ?? '',
				avatarUrl: githubUser.avatar_url ?? ''

            });
			await db.insert(oauth_account).values({
				provider: 'github',
                providerId: githubUser.id,
                userId: userId
            });

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
		console.error('Error during Github callback: ', e);
		
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

interface GitHubUser {
	name: string;
	avatar_url: string;
	id: string;
	login: string;
}