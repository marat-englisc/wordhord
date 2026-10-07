-- Rebuild the dependent journal before dropping its parent. foreign_keys stays ON:
-- toggling it inside the Drizzle migration transaction would have no effect.
-- Keep AUTOINCREMENT high-water marks, including IDs of already deleted rows.
CREATE TABLE `__saved_learning_sequences` AS
SELECT `name`, `seq` FROM `sqlite_sequence`
WHERE `name` IN ('user_card_meaning', 'user_card_meaning_review');--> statement-breakpoint
ALTER TABLE `user_card_meaning_review` ADD `last_elapsed_days` integer;--> statement-breakpoint
ALTER TABLE `user_card_meaning_review` ADD `learning_steps` integer;--> statement-breakpoint
CREATE TABLE `__saved_user_card_meaning_review` AS SELECT * FROM `user_card_meaning_review`;--> statement-breakpoint
CREATE TABLE `__new_user_card_meaning` (
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
	CONSTRAINT `fk_user_card_meaning_card_meaning_id_card_meaning_id_fk` FOREIGN KEY (`card_meaning_id`) REFERENCES `card_meaning`(`id`) ON DELETE CASCADE,
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
INSERT INTO `__new_user_card_meaning`(`id`, `user_id`, `card_meaning_id`, `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, `last_review`) SELECT `id`, `user_id`, `card_meaning_id`, `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, `last_review` FROM `user_card_meaning`;--> statement-breakpoint
DROP TABLE `user_card_meaning_review`;--> statement-breakpoint
DROP TABLE `user_card_meaning`;--> statement-breakpoint
ALTER TABLE `__new_user_card_meaning` RENAME TO `user_card_meaning`;--> statement-breakpoint
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
INSERT INTO `__new_user_card_meaning_review`(`id`, `user_id`, `card_meaning_id`, `user_card_meaning_id`, `rating`, `state`, `due`, `stability`, `difficulty`, `scheduled_days`, `elapsed_days`, `last_elapsed_days`, `learning_steps`, `review`) SELECT `id`, `user_id`, `card_meaning_id`, `user_card_meaning_id`, `rating`, `state`, `due`, `stability`, `difficulty`, `scheduled_days`, `elapsed_days`, `last_elapsed_days`, `learning_steps`, `review` FROM `__saved_user_card_meaning_review`;--> statement-breakpoint
ALTER TABLE `__new_user_card_meaning_review` RENAME TO `user_card_meaning_review`;--> statement-breakpoint
DROP TABLE `__saved_user_card_meaning_review`;--> statement-breakpoint
UPDATE `sqlite_sequence`
SET `seq` = max(`seq`, coalesce((
  SELECT saved.`seq` FROM `__saved_learning_sequences` saved
  WHERE saved.`name` = `sqlite_sequence`.`name`
), 0))
WHERE `name` IN ('user_card_meaning', 'user_card_meaning_review');--> statement-breakpoint
INSERT INTO `sqlite_sequence` (`name`, `seq`)
SELECT saved.`name`, saved.`seq` FROM `__saved_learning_sequences` saved
WHERE NOT EXISTS (SELECT 1 FROM `sqlite_sequence` WHERE `name` = saved.`name`);--> statement-breakpoint
DROP TABLE `__saved_learning_sequences`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_card_meaning_unique` ON `user_card_meaning` (`user_id`,`card_meaning_id`);--> statement-breakpoint
CREATE INDEX `user_card_meanings_due_idx` ON `user_card_meaning` (`user_id`,`due`);--> statement-breakpoint
CREATE INDEX `user_card_meanings_card_meaning_idx` ON `user_card_meaning` (`card_meaning_id`);--> statement-breakpoint
CREATE INDEX `user_card_meaning_reviews_user_idx` ON `user_card_meaning_review` (`user_id`,`review`);--> statement-breakpoint
CREATE INDEX `user_card_meaning_reviews_progress_idx` ON `user_card_meaning_review` (`user_card_meaning_id`,`review`);--> statement-breakpoint
CREATE INDEX `card_meaning_attributes_attribute_idx` ON `card_meaning_attribute` (`attribute_id`);--> statement-breakpoint
CREATE INDEX `user_decks_deck_idx` ON `user_deck` (`deck_id`);
