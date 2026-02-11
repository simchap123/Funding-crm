CREATE TABLE `document_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_url` text,
	`file_data` text,
	`file_size` integer,
	`mime_type` text,
	`page_count` integer DEFAULT 1,
	`order` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `document_fields` ADD `attachment_id` text REFERENCES document_attachments(id);