import { sql, relations } from 'drizzle-orm';
import { text, sqliteTable, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').notNull().primaryKey().unique(),
	username: text('username').notNull().default(''),
	name: text('name').notNull().default(''),
	avatarUrl: text('avatar_url').notNull().default(''),
	apiKeyHash: text('api_key_hash').notNull().default(''),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
export type InsertUser = typeof user.$inferInsert;
export type SelectUser = typeof user.$inferSelect;

export const oauth_account = sqliteTable(
	'oauth_account', {
		provider: text('provider',{ enum: ['google', 'github'] }).notNull(),
		providerId: text('provider_id').notNull().unique(),
		userId: text('user_id').notNull().unique().references(() => user.id)
	},
	(t) => ({
		pk: primaryKey(t.userId, t.providerId)
	})
);
export type InsertOAuthAccount = typeof oauth_account.$inferInsert;
export type SelectGroupOAuthAccount = typeof oauth_account.$inferSelect;

export const session = sqliteTable('session', {
	id: text('id').notNull().primaryKey().unique(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at').notNull()
});

export const save = sqliteTable('save', {
	id: text('id').notNull().primaryKey().unique(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	type: text('type',{ enum: ['text', 'website', 'image', 'color'] }).notNull(),
	url: text('url').notNull().default(''),
	title: text('title').notNull().default(''),
	description: text('description').notNull().default(''),
	faviconUrl: text('favicon_url').notNull().default(''),
	gradientIndex: integer('gradient_index').notNull().default(0),
	imageUrl: text('image_url').notNull().default(''),
	text: text('text').notNull().default(''),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
export type InsertSave = typeof save.$inferInsert;
export type SelectSave = typeof save.$inferSelect;

export const group = sqliteTable('group', {
	id: text('id').notNull().primaryKey().unique(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	title: text('title').notNull().default(''),
	gradientIndex: integer('gradient_index').notNull().default(0),
	parentId: text('parent_id').notNull().default(''),
	sortIndex: integer('sort_index').notNull().default(100),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
export type InsertGroup = typeof group.$inferInsert;
export type SelectGroup = typeof group.$inferSelect;

export const save_group_mm = sqliteTable(
	'save_group_mm',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		saveId: text('save_id')
			.notNull()
			.references(() => save.id),
		groupId: text('group_id')
			.notNull()
			.references(() => group.id)
	},
	(t) => ({
		pk: primaryKey(t.userId, t.saveId, t.groupId)
	})
);


export const userRelations = relations(user, ({ one, many }) => ({
	saves: many(save),
	groups: many(group),
	saveGroupMm: many(save_group_mm),
	// oauthAccount: one(oauth_account)
}));

export const oauthAccountRelations = relations(oauth_account, ({ one }) => ({
	user: one(user, {
		fields: [oauth_account.userId],
		references: [user.id]
	}),
}));

export const groupRelations = relations(group, ({ one, many }) => ({
	user: one(user, {
		fields: [group.userId],
		references: [user.id]
	}),
	saves: many(save_group_mm)
}));

export const saveRelations = relations(save, ({ one, many }) => ({
	user: one(user, {
		fields: [save.userId],
		references: [user.id]
	}),
	saveGroups: many(save_group_mm)
}));

export const saveGroupMmRelations = relations(save_group_mm, ({ one }) => ({
	user: one(user, {
		fields: [save_group_mm.userId],
		references: [user.id]
	}),
	save: one(save, {
		fields: [save_group_mm.saveId],
		references: [save.id]
	}),
	group: one(group, {
		fields: [save_group_mm.groupId],
		references: [group.id]
	})
}));
