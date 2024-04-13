ALTER TABLE `group` ADD `sort_index` integer NOT NULL DEFAULT 100;--> statement-breakpoint
ALTER TABLE `group` DROP COLUMN `index`;