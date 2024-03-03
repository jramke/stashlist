import { Lucia } from 'lucia';

import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { session, user } from '$lib/server/db/schema';
import { GitHub, Google } from "arctic";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "$env/static/private";

const adapter = new DrizzleSQLiteAdapter(db, session, user);

export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET);

const baseUrl = dev ? 'http://localhost:5173' : 'https://stashlist.app';
const redirectUrl = `${baseUrl}/login/google/callback`;
export const google = new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUrl);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// set to `true` when using HTTPS
			secure: !dev
		}
	},
	getUserAttributes: (attributes) => {
		return {
			// attributes has the type of DatabaseUserAttributes
			// githubId: attributes.github_id,
			username: attributes.username,
			name: attributes.name,
			avatarUrl: attributes.avatarUrl
		};
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	// github_id: number;
	username: string;
	name: string;
	avatarUrl: string;
}
