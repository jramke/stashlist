CREATE TABLE `group` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`gradient_index` integer DEFAULT 0 NOT NULL,
	`parent_id` text DEFAULT '' NOT NULL,
	`sort_index` integer DEFAULT 100 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `oauth_account` (
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`provider_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `save` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`favicon_url` text DEFAULT '' NOT NULL,
	`gradient_index` integer DEFAULT 0 NOT NULL,
	`image_url` text DEFAULT '' NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `save_group_mm` (
	`user_id` text NOT NULL,
	`save_id` text NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`group_id`, `save_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`save_id`) REFERENCES `save`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_id`) REFERENCES `group`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`avatar_url` text DEFAULT '' NOT NULL,
	`api_key_hash` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_id_unique` ON `group` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_account_provider_id_unique` ON `oauth_account` (`provider_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_account_user_id_unique` ON `oauth_account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `save_id_unique` ON `save` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_id_unique` ON `session` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_id_unique` ON `user` (`id`);