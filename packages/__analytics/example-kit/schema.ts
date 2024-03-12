export const page_views = sqliteTable('page_views', {
	id: text('id').notNull().primaryKey().unique(),
	slug: text('slug').default(''),
	visitorId: text('visitor_id').notNull().references(() => page_visitors.id),
	referrer: text('referrer').default(''),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});
export const page_visitors = sqliteTable('page_visitors', {
	id: text('id').notNull().primaryKey().unique(),
	ipAddress: text('ip_address').notNull(),
	userAgent: text('user_agent').default(''),
	createdAt: text('created_at')
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
});

// export const page_views_visitors_mm = sqliteTable('page_views_visitors_mm', {
// 	id: text('id').notNull().primaryKey().unique(),
// 	pageViewId: text('page_view_id').notNull().references(() => page_views.id),
// 	pageVisitorId: text('page_visitor_id').notNull().references(() => page_visitors.id),
// 	referrer: text('referrer').default(''),
// 	createdAt: text('created_at')
// 		.default(sql`CURRENT_TIMESTAMP`)
// 		.notNull()
// }
// // , (t) => ({
// // 	pk: primaryKey(t.pageViewId, t.pageVisitorId)
// // })
// );
// export const pageViewsVisitorsRelations = relations(page_views_visitors_mm, ({ one }) => ({
// 	pageVisitors: one(page_visitors, {
// 		fields: [page_views_visitors_mm.pageVisitorId],
// 		references: [page_visitors.id]
// 	}),
// 	pageViews: one(page_views, {
// 		fields: [page_views_visitors_mm.pageViewId],
// 		references: [page_views.id]
// 	}),
// }));