CREATE TABLE `signing_verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_id` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`recipient_id`) REFERENCES `document_recipients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lender_quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`lender_id` text,
	`lender_name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`rate` real,
	`points` real,
	`fees` real,
	`loan_amount` real,
	`term_months` integer,
	`notes` text,
	`received_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `lender_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lender_id`) REFERENCES `lenders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `lender_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`email_id` text,
	`subject` text,
	`message` text,
	`lender_ids` text NOT NULL,
	`lender_emails` text NOT NULL,
	`sent_at` text,
	`owner_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`email_id`) REFERENCES `emails`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lenders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text,
	`phone` text,
	`notes` text,
	`submission_guidelines` text,
	`owner_id` text,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "tags_name_unique";--> statement-breakpoint
ALTER TABLE `contacts` ALTER COLUMN "stage" TO "stage" text NOT NULL DEFAULT 'new_lead';--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);