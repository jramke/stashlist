import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const { DATABASE_URL, DATABASE_AUTH_TOKEN } = process.env;
if (!DATABASE_URL) {
	throw new Error('No url');
}
if (!DATABASE_AUTH_TOKEN) {
	throw new Error('No auth token');
}

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	driver: 'turso',
	dialect: 'sqlite',
	dbCredentials: {
		url: DATABASE_URL,
		authToken: DATABASE_AUTH_TOKEN
	},
	// strict: true
	verbose: true,
} satisfies Config;
