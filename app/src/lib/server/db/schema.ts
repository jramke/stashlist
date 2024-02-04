import { sql, relations } from 'drizzle-orm';
import { text, sqliteTable, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').notNull().primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	hashedPassword: text('hashed_password').notNull(),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const session = sqliteTable('session', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at').notNull()
});

export const save = sqliteTable('save', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	url: text('url').notNull(),
	title: text('title').default(''),
	description: text('description').default(''),
	faviconUrl: text('favicon_url').default(''),
	imageUrl: text('image_url').default(''),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const group = sqliteTable('group', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	title: text('title').default(''),
	slug: text('slug').default(''),
	parentId: text('parent_id').default(''),
	index: real('index').default(1.0),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

export const save_group_mm = sqliteTable('save_group_mm', {
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	saveId: text('save_id')
		.notNull()
		.references(() => save.id),
	groupId: text('group_id')
		.notNull()
		.references(() => group.id)
	}, (t) => ({
		pk: primaryKey(t.userId, t.saveId, t.groupId),
	})
);

// export const userRelations = relations(user, ({ many }) => ({
// 	saves: many(save),
// 	save_group_mm: many(save_group_mm)
// }));

// export const saveRelations = relations(save, ({ one }) => ({
// 	user: one(user, {
// 		fields: [save.userId],
// 		references: [user.id]
// 	})
// }));

export const userRelations = relations(user, ({ many }) => ({
	saves: many(save),
	groups: many(group),
	saveGroupMm: many(save_group_mm)
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
