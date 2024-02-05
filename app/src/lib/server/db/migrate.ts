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

async function main() {
	const db = drizzle(createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN }));

	console.log('Running migrations');

	await migrate(db, { migrationsFolder: 'drizzle' });

	console.log('Migrated successfully');

	process.exit(0);
}

main().catch((e) => {
	console.error('Migration failed');
	console.error(e);
	process.exit(1);
});
