import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const client = createClient({ 
    url: "file:stashlist-replica.db",
    syncUrl: env.DATABASE_URL, 
    authToken: env.DATABASE_AUTH_TOKEN,
    encryptionKey: env.DATABASE_REPLICA_ENCRYPTION_KEY,
    syncInterval: 60,
});

export const db = drizzle(client, { schema });
