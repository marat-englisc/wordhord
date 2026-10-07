import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { CONSTANTS } from "../config/constants";
import { openDatabaseFile, resolveDatabasePaths, type DatabasePaths } from "./connection";
import { assertDatabaseLayout, assertForeignKeys, CONTENT_TABLES, USER_TABLES } from "./layout";

export function migrateDatabases(paths: DatabasePaths, migrationRoot = resolve("drizzle")) {
  const resolved = resolveDatabasePaths(paths);
  const targets = [
    { path: resolved.contentPath, folder: "content", tables: CONTENT_TABLES, other: USER_TABLES },
    { path: resolved.usersPath, folder: "users", tables: USER_TABLES, other: CONTENT_TABLES },
  ];
  // Preflight both files before applying either set of migrations.
  for (const target of targets) {
    const client = openDatabaseFile(target.path);
    try { assertDatabaseLayout(client, "main", target.tables, target.other, false); }
    finally { client.close(); }
  }
  for (const target of targets) {
    const client = openDatabaseFile(target.path);
    try {
      migrate(drizzle({ client }), { migrationsFolder: resolve(migrationRoot, target.folder) });
      assertDatabaseLayout(client, "main", target.tables, target.other);
      assertForeignKeys(client, "main");
    } finally {
      client.close();
    }
  }
  return resolved;
}

if (require.main === module) {
  try {
    const paths = migrateDatabases({
      contentPath: CONSTANTS.CONTENT_DATABASE_URL,
      usersPath: CONSTANTS.USERS_DATABASE_URL,
    });
    console.log(`Content migrations applied: ${paths.contentPath}`);
    console.log(`User migrations applied: ${paths.usersPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
