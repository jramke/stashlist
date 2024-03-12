import { sql, relations } from 'drizzle-orm';
import { text, sqliteTable, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').notNull().primaryKey().unique(),
	username: text('username').default(''),
	name: text('name').default(''),
	avatarUrl: text('avatar_url').default(''),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

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
	type: text('type',{ enum: ['code', 'website', 'image'] }).notNull(),
	url: text('url').default(''),
	title: text('title').default(''),
	description: text('description').default(''),
	faviconUrl: text('favicon_url').default(''),
	imageUrl: text('image_url').default(''),
	codeText: text('code_text').default(''),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const group = sqliteTable('group', {
	id: text('id').notNull().primaryKey().unique(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	title: text('title').default(''),
	// slug: text('slug').default(''),
	parentId: text('parent_id').default(''),
	index: real('index').default(1.0),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

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
