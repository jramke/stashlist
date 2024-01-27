import { sql } from "drizzle-orm";
import { text, sqliteTable, integer } from "drizzle-orm/sqlite-core";

export const user = sqliteTable('user', {
	id: text('id').notNull().primaryKey(),
	name: text('name'),
	email: text('email').notNull(),
	hashedPassword: text('hashed_password'),
  	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const session = sqliteTable('session', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer("expires_at").notNull()
});

// export const key = sqliteTable('user_key', {
// 	id: text('id').primaryKey(),
// 	userId: text('user_id')
// 		.notNull()
// 		.references(() => user.id),
// 	hashedPassword: text('hashed_password')
// });