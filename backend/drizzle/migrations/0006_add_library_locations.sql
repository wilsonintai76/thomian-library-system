CREATE TABLE `library_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`min_ddc` real,
	`max_ddc` real,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE `patrons` ADD `patron_id` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `patrons_patron_id_unique` ON `patrons` (`patron_id`);--> statement-breakpoint
ALTER TABLE `patrons` DROP COLUMN `student_id`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text,
	`full_name` text,
	`email` text NOT NULL,
	`role` text DEFAULT 'STUDENT',
	`password_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO `__new_profiles`("id", "staff_id", "full_name", "email", "role", "password_hash", "created_at") SELECT "id", "staff_id", "full_name", "email", "role", "password_hash", "created_at" FROM `profiles`;--> statement-breakpoint
DROP TABLE `profiles`;--> statement-breakpoint
ALTER TABLE `__new_profiles` RENAME TO `profiles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_staff_id_unique` ON `profiles` (`staff_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_email_unique` ON `profiles` (`email`);