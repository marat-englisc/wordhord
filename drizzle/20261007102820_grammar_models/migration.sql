CREATE TABLE `rule` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`order` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "rule_order_check" CHECK(typeof("order") = 'integer' AND "order" >= 0)
);
--> statement-breakpoint
CREATE TABLE `rule_image` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`rule_id` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`image_url` text NOT NULL,
	CONSTRAINT `fk_rule_image_rule_id_rule_id_fk` FOREIGN KEY (`rule_id`) REFERENCES `rule`(`id`) ON DELETE CASCADE,
	CONSTRAINT "rule_image_order_check" CHECK(typeof("order") = 'integer' AND "order" >= 0)
);
--> statement-breakpoint
CREATE TABLE `rule_section` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`rule_id` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT `fk_rule_section_rule_id_rule_id_fk` FOREIGN KEY (`rule_id`) REFERENCES `rule`(`id`) ON DELETE CASCADE,
	CONSTRAINT "rule_section_order_check" CHECK(typeof("order") = 'integer' AND "order" >= 0)
);
--> statement-breakpoint
CREATE TABLE `rule_section_example` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`rule_section_id` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`example` text NOT NULL,
	`example_translation` text NOT NULL,
	CONSTRAINT `fk_rule_section_example_rule_section_id_rule_section_id_fk` FOREIGN KEY (`rule_section_id`) REFERENCES `rule_section`(`id`) ON DELETE CASCADE,
	CONSTRAINT "rule_section_example_order_check" CHECK(typeof("order") = 'integer' AND "order" >= 0)
);
--> statement-breakpoint
CREATE TABLE `rule_section_primary_info` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`rule_section_id` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT `fk_rule_section_primary_info_rule_section_id_rule_section_id_fk` FOREIGN KEY (`rule_section_id`) REFERENCES `rule_section`(`id`) ON DELETE CASCADE,
	CONSTRAINT "rule_section_primary_info_order_check" CHECK(typeof("order") = 'integer' AND "order" >= 0)
);
--> statement-breakpoint
CREATE TABLE `user_rule` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`rule_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT `fk_user_rule_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_user_rule_rule_id_rule_id_fk` FOREIGN KEY (`rule_id`) REFERENCES `rule`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_rule_comment` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`rule_id` integer NOT NULL,
	`comment` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT `fk_user_rule_comment_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_user_rule_comment_rule_id_rule_id_fk` FOREIGN KEY (`rule_id`) REFERENCES `rule`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `rules_order_idx` ON `rule` (`order`);--> statement-breakpoint
CREATE INDEX `rule_images_rule_order_idx` ON `rule_image` (`rule_id`,`order`);--> statement-breakpoint
CREATE INDEX `rule_sections_rule_order_idx` ON `rule_section` (`rule_id`,`order`);--> statement-breakpoint
CREATE INDEX `rule_section_examples_section_order_idx` ON `rule_section_example` (`rule_section_id`,`order`);--> statement-breakpoint
CREATE INDEX `rule_section_primary_info_section_order_idx` ON `rule_section_primary_info` (`rule_section_id`,`order`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_rule_unique` ON `user_rule` (`user_id`,`rule_id`);--> statement-breakpoint
CREATE INDEX `user_rules_rule_idx` ON `user_rule` (`rule_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_rule_comment_unique` ON `user_rule_comment` (`user_id`,`rule_id`);--> statement-breakpoint
CREATE INDEX `user_rule_comments_rule_idx` ON `user_rule_comment` (`rule_id`);