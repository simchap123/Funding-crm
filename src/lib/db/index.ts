import { drizzle as drizzleBetterSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import * as schema from "./schema";

function createDb() {
  const url = process.env.TURSO_DATABASE_URL!;

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
  return drizzleLibsql(client, { schema });
}

export const db = createDb() as ReturnType<typeof drizzleBetterSqlite<typeof schema>>;
