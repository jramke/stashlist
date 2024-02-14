import { migrate } from 'drizzle-orm/libsql/migrator';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const { DATABASE_URL, DATABASE_AUTH_TOKEN } = process.env;
if (!DATABASE_URL) {
	throw new Error('No url');
}
if (!DATABASE_AUTH_TOKEN) {
	throw new Error('No auth token');
}

const client = createClient({ url: DATABASE_URL as string, authToken: DATABASE_AUTH_TOKEN as string });
const db = drizzle(client);

async function main() {
	try {
		console.log('Migration started...');
		await migrate(db, {
			migrationsFolder: 'drizzle'
		});
		console.log('Tables migrated!');
		process.exit(0);
	} catch (error) {
		console.error('Error performing migration: ', error);
		process.exit(1);
  	}
}
main();