import { createClient } from "@libsql/client";

async function setupFTS() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Setting up FTS5 virtual table...");

  // Create FTS5 virtual table
  await client.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts5(
      id UNINDEXED,
      first_name,
      last_name,
      email,
      phone,
      company,
      content='contacts',
      content_rowid='rowid'
    );
  `);

  // Create triggers to keep FTS in sync
  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS contacts_ai AFTER INSERT ON contacts BEGIN
      INSERT INTO contacts_fts(id, first_name, last_name, email, phone, company)
      VALUES (new.id, new.first_name, new.last_name, new.email, new.phone, new.company);
    END;
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS contacts_ad AFTER DELETE ON contacts BEGIN
      INSERT INTO contacts_fts(contacts_fts, id, first_name, last_name, email, phone, company)
      VALUES ('delete', old.id, old.first_name, old.last_name, old.email, old.phone, old.company);
    END;
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS contacts_au AFTER UPDATE ON contacts BEGIN
      INSERT INTO contacts_fts(contacts_fts, id, first_name, last_name, email, phone, company)
      VALUES ('delete', old.id, old.first_name, old.last_name, old.email, old.phone, old.company);
      INSERT INTO contacts_fts(id, first_name, last_name, email, phone, company)
      VALUES (new.id, new.first_name, new.last_name, new.email, new.phone, new.company);
    END;
  `);

  console.log("FTS5 setup complete!");
  process.exit(0);
}

setupFTS().catch(console.error);
