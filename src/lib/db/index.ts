import { drizzle as drizzleBetterSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzleBetterSqlite<typeof schema>>;

let _db: DbInstance | null = null;

function createDb(): DbInstance {
  const url = process.env.TURSO_DATABASE_URL;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  if (url.startsWith("file:")) {
    // Local development with better-sqlite3
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const sqlite = new Database(url.replace("file:", ""));
    sqlite.pragma("journal_mode = WAL");
    return drizzleBetterSqlite(sqlite, { schema });
  }

  // Remote Turso/libsql
  const { createClient } = require("@libsql/client");
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzleLibsql(client, { schema }) as unknown as DbInstance;
}

export const db = new Proxy({} as DbInstance, {
  get(_target, prop) {
    if (!_db) {
      _db = createDb();
    }
    return (_db as any)[prop];
  },
});
