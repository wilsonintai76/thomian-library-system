-- Migration: 0000_gray_wraith
-- Generated from backend/src/db/schema.ts

CREATE TABLE IF NOT EXISTS `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text UNIQUE,
	`full_name` text,
	`email` text UNIQUE NOT NULL,
	`role` text DEFAULT 'LIBRARIAN',
	`password_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `books` (
	`id` text PRIMARY KEY NOT NULL,
	`isbn` text,
	`title` text NOT NULL,
	`author` text,
	`ddc_code` text,
	`classification` text,
	`call_number` text,
	`barcode_id` text UNIQUE,
	`shelf_location` text,
	`cover_url` text,
	`value` real DEFAULT 0,
	`vendor` text,
	`acquisition_date` text,
	`series` text,
	`edition` text,
	`publisher_id` text,
	`pub_year` text,
	`format` text,
	`language` text,
	`pages` integer,
	`summary` text,
	`subjects` text,
	`marc_metadata` text,
	`status` text DEFAULT 'AVAILABLE',
	`material_type` text DEFAULT 'BOOK',
	`loan_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `patrons` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text UNIQUE NOT NULL,
	`full_name` text NOT NULL,
	`card_name` text,
	`patron_group` text NOT NULL,
	`library_class_id` text,
	`email` text,
	`phone` text,
	`photo_url` text,
	`is_blocked` integer DEFAULT false,
	`is_archived` integer DEFAULT false,
	`fines` real DEFAULT 0,
	`total_paid` real DEFAULT 0,
	`pin` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`patron_id` text NOT NULL,
	`loaned_at` text DEFAULT CURRENT_TIMESTAMP,
	`due_date` text NOT NULL,
	`returned_at` text,
	`renewal_count` integer DEFAULT 0,
	`issued_by` text,
	`status` text DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`patron_id` text,
	`book_id` text,
	`type` text NOT NULL,
	`amount` real DEFAULT 0,
	`status` text DEFAULT 'COMPLETED',
	`notes` text,
	`issued_by` text,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `library_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`teacher_name` text,
	`academic_year` text,
	`status` text DEFAULT 'ACTIVE',
	`department` text,
	`student_count` integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS `circulation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`patron_group` text NOT NULL,
	`item_type` text NOT NULL,
	`max_items` integer DEFAULT 5,
	`loan_period_days` integer DEFAULT 14,
	`max_renewals` integer DEFAULT 2,
	`fine_per_day` real DEFAULT 0.50,
	`grace_period_days` integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS `system_configuration` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`map_data` text,
	`logo` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `system_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'ACTIVE',
	`location` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`resolved_at` text
);

CREATE TABLE IF NOT EXISTS `library_events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` text NOT NULL,
	`end_time` text,
	`location` text,
	`status` text DEFAULT 'UPCOMING'
);
