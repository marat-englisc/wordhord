CREATE TABLE `__new_user_card_meaning_review` (
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
	`last_elapsed_days` integer NOT NULL,
	`learning_steps` integer NOT NULL,
	`review` integer NOT NULL,
	CONSTRAINT `user_card_meaning_review_progress_fk` FOREIGN KEY (`user_card_meaning_id`,`user_id`,`card_meaning_id`) REFERENCES `user_card_meaning`(`id`,`user_id`,`card_meaning_id`) ON DELETE CASCADE,
	CONSTRAINT "user_card_meaning_review_rating_check" CHECK("rating" IN (0, 1, 2, 3, 4)),
	CONSTRAINT "user_card_meaning_review_state_check" CHECK("state" IN (0, 1, 2, 3)),
	CONSTRAINT "user_card_meaning_review_stability_check" CHECK(typeof("stability") IN ('integer', 'real') AND "stability" >= 0),
	CONSTRAINT "user_card_meaning_review_difficulty_check" CHECK(typeof("difficulty") IN ('integer', 'real') AND "difficulty" BETWEEN 0 AND 10),
	CONSTRAINT "user_card_meaning_review_counters_check" CHECK(typeof("elapsed_days") = 'integer' AND "elapsed_days" >= 0
        AND typeof("scheduled_days") = 'integer' AND "scheduled_days" >= 0
        AND typeof("last_elapsed_days") = 'integer' AND "last_elapsed_days" >= 0
        AND typeof("learning_steps") = 'integer' AND "learning_steps" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_user_card_meaning_review`(`id`, `user_id`, `card_meaning_id`, `user_card_meaning_id`, `rating`, `state`, `due`, `stability`, `difficulty`, `scheduled_days`, `elapsed_days`, `last_elapsed_days`, `learning_steps`, `review`) SELECT `id`, `user_id`, `card_meaning_id`, `user_card_meaning_id`, `rating`, `state`, `due`, `stability`, `difficulty`, `scheduled_days`, `elapsed_days`, `last_elapsed_days`, `learning_steps`, `review` FROM `user_card_meaning_review`;--> statement-breakpoint
DROP TABLE `user_card_meaning_review`;--> statement-breakpoint
ALTER TABLE `__new_user_card_meaning_review` RENAME TO `user_card_meaning_review`;--> statement-breakpoint
CREATE INDEX `user_card_meaning_reviews_user_idx` ON `user_card_meaning_review` (`user_id`,`review`);--> statement-breakpoint
CREATE INDEX `user_card_meaning_reviews_progress_idx` ON `user_card_meaning_review` (`user_card_meaning_id`,`review`);
