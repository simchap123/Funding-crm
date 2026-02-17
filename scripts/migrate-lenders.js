const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../local.db"));
db.pragma("journal_mode = WAL");

const sql = `
CREATE TABLE IF NOT EXISTS lenders (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  phone text,
  notes text,
  submission_guidelines text,
  owner_id text,
  sort_order integer DEFAULT 0,
  is_active integer NOT NULL DEFAULT 1,
  created_at text NOT NULL DEFAULT (current_timestamp),
  updated_at text NOT NULL DEFAULT (current_timestamp),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS lender_submissions (
  id text PRIMARY KEY NOT NULL,
  loan_id text NOT NULL,
  email_id text,
  subject text,
  message text,
  lender_ids text NOT NULL,
  lender_emails text NOT NULL,
  sent_at text,
  owner_id text,
  created_at text NOT NULL DEFAULT (current_timestamp),
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (email_id) REFERENCES emails(id) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS lender_quotes (
  id text PRIMARY KEY NOT NULL,
  submission_id text NOT NULL,
  lender_id text,
  lender_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rate real,
  points real,
  fees real,
  loan_amount real,
  term_months integer,
  notes text,
  received_at text,
  created_at text NOT NULL DEFAULT (current_timestamp),
  updated_at text NOT NULL DEFAULT (current_timestamp),
  FOREIGN KEY (submission_id) REFERENCES lender_submissions(id) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (lender_id) REFERENCES lenders(id) ON UPDATE no action ON DELETE set null
);
`;

try {
  db.exec(sql);
  console.log("Migration applied successfully: lenders, lender_submissions, lender_quotes tables created.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}

db.close();
