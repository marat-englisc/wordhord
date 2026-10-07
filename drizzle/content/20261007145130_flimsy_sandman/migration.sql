CREATE TABLE `attribute` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `card` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`deck_id` integer NOT NULL,
	`title` text NOT NULL,
	`transcription` text,
	`audio_url` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_card_deck_id_deck_id_fk` FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `card_example` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`card_meaning_id` integer NOT NULL,
	`example` text NOT NULL,
	`example_translation` text NOT NULL,
	CONSTRAINT `fk_card_example_card_meaning_id_card_meaning_id_fk` FOREIGN KEY (`card_meaning_id`) REFERENCES `card_meaning`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `card_meaning` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`card_id` integer NOT NULL,
	`hint` text,
	`meaning` text NOT NULL,
	`meaning_translation` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_card_meaning_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `card_meaning_attribute` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`card_meaning_id` integer NOT NULL,
	`attribute_id` integer NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_card_meaning_attribute_card_meaning_id_card_meaning_id_fk` FOREIGN KEY (`card_meaning_id`) REFERENCES `card_meaning`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_card_meaning_attribute_attribute_id_attribute_id_fk` FOREIGN KEY (`attribute_id`) REFERENCES `attribute`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `deck` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
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
CREATE INDEX `cards_deck_id_index` ON `card` (`deck_id`);--> statement-breakpoint
CREATE INDEX `card_examples_card_meaning_id_index` ON `card_example` (`card_meaning_id`);--> statement-breakpoint
CREATE INDEX `card_meanings_card_id_index` ON `card_meaning` (`card_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_meaning_attribute_unique` ON `card_meaning_attribute` (`card_meaning_id`,`attribute_id`,`value`);--> statement-breakpoint
CREATE INDEX `card_meaning_attributes_attribute_idx` ON `card_meaning_attribute` (`attribute_id`);--> statement-breakpoint
CREATE INDEX `rules_order_idx` ON `rule` (`order`);--> statement-breakpoint
CREATE INDEX `rule_images_rule_order_idx` ON `rule_image` (`rule_id`,`order`);--> statement-breakpoint
CREATE INDEX `rule_sections_rule_order_idx` ON `rule_section` (`rule_id`,`order`);--> statement-breakpoint
CREATE INDEX `rule_section_examples_section_order_idx` ON `rule_section_example` (`rule_section_id`,`order`);--> statement-breakpoint
CREATE INDEX `rule_section_primary_info_section_order_idx` ON `rule_section_primary_info` (`rule_section_id`,`order`);