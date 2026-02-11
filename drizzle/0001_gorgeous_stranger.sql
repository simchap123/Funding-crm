CREATE TABLE `loan_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`metadata` text,
	`user_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `loan_conditions` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_date` text,
	`cleared_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`loan_type` text NOT NULL,
	`stage` text DEFAULT 'application' NOT NULL,
	`amount` real,
	`interest_rate` real,
	`term_months` integer,
	`property_address` text,
	`property_city` text,
	`property_state` text,
	`property_zip` text,
	`estimated_value` real,
	`down_payment` real,
	`credit_score` integer,
	`annual_income` real,
	`dti_ratio` real,
	`lender` text,
	`loan_number` text,
	`closing_date` text,
	`notes` text,
	`owner_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `document_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_email` text,
	`actor_name` text,
	`ip_address` text,
	`metadata` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text,
	`required` integer DEFAULT true NOT NULL,
	`page` integer DEFAULT 1 NOT NULL,
	`x_percent` real NOT NULL,
	`y_percent` real NOT NULL,
	`width_percent` real NOT NULL,
	`height_percent` real NOT NULL,
	`value` text,
	`filled_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `document_recipients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'signer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`order` integer DEFAULT 1 NOT NULL,
	`access_token` text NOT NULL,
	`contact_id` text,
	`signed_at` text,
	`viewed_at` text,
	`declined_at` text,
	`decline_reason` text,
	`ip_address` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`file_name` text,
	`file_url` text,
	`file_size` integer,
	`mime_type` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`contact_id` text,
	`loan_id` text,
	`is_template` integer DEFAULT false NOT NULL,
	`template_id` text,
	`expires_at` text,
	`message` text,
	`sent_at` text,
	`completed_at` text,
	`owner_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`imap_host` text,
	`imap_port` integer,
	`imap_secure` integer DEFAULT true,
	`smtp_host` text,
	`smtp_port` integer,
	`smtp_secure` integer DEFAULT true,
	`password` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_sync_at` text,
	`sync_error` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `email_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`email_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text,
	`file_size` integer,
	`file_url` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`email_id`) REFERENCES `emails`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`thread_id` text,
	`message_id` text,
	`in_reply_to` text,
	`direction` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`from_email` text NOT NULL,
	`from_name` text,
	`to_emails` text NOT NULL,
	`cc_emails` text,
	`bcc_emails` text,
	`subject` text,
	`body_html` text,
	`body_text` text,
	`snippet` text,
	`is_read` integer DEFAULT false NOT NULL,
	`is_starred` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`contact_id` text,
	`user_id` text,
	`lead_created` integer DEFAULT false NOT NULL,
	`received_at` text,
	`sent_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `email_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
