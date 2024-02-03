import { sql } from 'drizzle-orm';
import { text, sqliteTable, integer, real } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').notNull().primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	hashedPassword: text('hashed_password').notNull(),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const session = sqliteTable('session', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	expiresAt: integer('expires_at').notNull()
});

export const save = sqliteTable('save', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	url: text('url').notNull(),
	title: text('title').default(''),
	description: text('description').default(''),
	faviconUrl: text('favicon_url').default(''),
	imageUrl: text('image_url').default(''),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const group = sqliteTable('group', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	title: text('title').default(''),
	slug: text('slug').default(''),
	parentId: text('parent_id').default(''),
	index: real('index').default(1.0),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const save_group_mm = sqliteTable('save_group_mm', {
	userId: text('user_id').notNull().references(() => user.id),
    saveId: text('save_id').notNull().references(() => save.id),
    groupId: text('group_id').notNull().references(() => group.id),
});