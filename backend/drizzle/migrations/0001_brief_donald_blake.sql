PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_library_events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date` text,
	`type` text,
	`start_time` text,
	`end_time` text,
	`location` text,
	`status` text DEFAULT 'UPCOMING'
);
--> statement-breakpoint
INSERT INTO `__new_library_events`("id", "title", "description", "start_time", "end_time", "location", "status") SELECT "id", "title", "description", "start_time", "end_time", "location", "status" FROM `library_events`;--> statement-breakpoint
DROP TABLE `library_events`;--> statement-breakpoint
ALTER TABLE `__new_library_events` RENAME TO `library_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;