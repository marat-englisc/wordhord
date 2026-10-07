CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`telegram_id` integer NOT NULL UNIQUE,
	`username` text,
	`first_name` text,
	`last_name` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_card_meaning` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`card_meaning_id` integer NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`learning_steps` integer NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`state` integer NOT NULL,
	`last_review` integer,
	CONSTRAINT `fk_user_card_meaning_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `user_card_meaning_identity_unique` UNIQUE(`id`,`user_id`,`card_meaning_id`),
	CONSTRAINT "user_card_meaning_state_check" CHECK("state" IN (0, 1, 2, 3)),
	CONSTRAINT "user_card_meaning_stability_check" CHECK(typeof("stability") IN ('integer', 'real') AND "stability" >= 0),
	CONSTRAINT "user_card_meaning_difficulty_check" CHECK(typeof("difficulty") IN ('integer', 'real') AND "difficulty" BETWEEN 0 AND 10),
	CONSTRAINT "user_card_meaning_counters_check" CHECK(typeof("elapsed_days") = 'integer' AND "elapsed_days" >= 0
        AND typeof("scheduled_days") = 'integer' AND "scheduled_days" >= 0
        AND typeof("learning_steps") = 'integer' AND "learning_steps" >= 0
        AND typeof("reps") = 'integer' AND "reps" >= 0
        AND typeof("lapses") = 'integer' AND "lapses" >= 0)
);
--> statement-breakpoint
CREATE TABLE `user_card_meaning_review` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`card_meaning_id` integer NOT NULL,
	`user_card_meaning_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`state` integer NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`scheduled_days` integer NOT NULL,
	`elapsed_days` integer NOT NULL,
	`last_elapsed_days` integer,
	`learning_steps` integer,
	`review` integer NOT NULL,
	CONSTRAINT `user_card_meaning_review_progress_fk` FOREIGN KEY (`user_card_meaning_id`,`user_id`,`card_meaning_id`) REFERENCES `user_card_meaning`(`id`,`user_id`,`card_meaning_id`) ON DELETE CASCADE,
	CONSTRAINT "user_card_meaning_review_rating_check" CHECK("rating" IN (0, 1, 2, 3, 4)),
	CONSTRAINT "user_card_meaning_review_state_check" CHECK("state" IN (0, 1, 2, 3)),
	CONSTRAINT "user_card_meaning_review_stability_check" CHECK(typeof("stability") IN ('integer', 'real') AND "stability" >= 0),
	CONSTRAINT "user_card_meaning_review_difficulty_check" CHECK(typeof("difficulty") IN ('integer', 'real') AND "difficulty" BETWEEN 0 AND 10),
	CONSTRAINT "user_card_meaning_review_counters_check" CHECK(typeof("elapsed_days") = 'integer' AND "elapsed_days" >= 0
        AND typeof("scheduled_days") = 'integer' AND "scheduled_days" >= 0
        AND ("last_elapsed_days" IS NULL OR (
          typeof("last_elapsed_days") = 'integer' AND "last_elapsed_days" >= 0
        ))
        AND ("learning_steps" IS NULL OR (
          typeof("learning_steps") = 'integer' AND "learning_steps" >= 0
        )))
);
--> statement-breakpoint
CREATE TABLE `user_deck` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`deck_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`last_reviewed_at` integer,
	CONSTRAINT `fk_user_deck_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_rule` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`rule_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT `fk_user_rule_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_rule_comment` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`rule_id` integer NOT NULL,
	`comment` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT `fk_user_rule_comment_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_card_meaning_unique` ON `user_card_meaning` (`user_id`,`card_meaning_id`);--> statement-breakpoint
CREATE INDEX `user_card_meanings_due_idx` ON `user_card_meaning` (`user_id`,`due`);--> statement-breakpoint
CREATE INDEX `user_card_meanings_card_meaning_idx` ON `user_card_meaning` (`card_meaning_id`);--> statement-breakpoint
CREATE INDEX `user_card_meaning_reviews_user_idx` ON `user_card_meaning_review` (`user_id`,`review`);--> statement-breakpoint
CREATE INDEX `user_card_meaning_reviews_progress_idx` ON `user_card_meaning_review` (`user_card_meaning_id`,`review`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_deck_unique` ON `user_deck` (`user_id`,`deck_id`);--> statement-breakpoint
CREATE INDEX `user_decks_deck_idx` ON `user_deck` (`deck_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_rule_unique` ON `user_rule` (`user_id`,`rule_id`);--> statement-breakpoint
CREATE INDEX `user_rules_rule_idx` ON `user_rule` (`rule_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_rule_comment_unique` ON `user_rule_comment` (`user_id`,`rule_id`);--> statement-breakpoint
CREATE INDEX `user_rule_comments_rule_idx` ON `user_rule_comment` (`rule_id`);