import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { normalizeSearchText } from "./search";
import {
  assertContentReferences,
  assertDatabaseLayout,
  assertForeignKeys,
  CONTENT_TABLES,
  USER_TABLES,
  installContentReferenceTriggers,
} from "./layout";

export interface DatabasePaths {
  contentPath: string;
  usersPath: string;
}

export function resolveDatabasePath(value: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    /^(file:|[a-z]+:\/\/)/i.test(value)
  ) {
    throw new RangeError(
      "Database paths must be ordinary file paths or :memory:",
    );
  }
  return value === ":memory:" ? value : resolve(value);
}

export function getDatabaseFileIdentity(value: string) {
  const path = resolveDatabasePath(value);
  let ancestor = path;
  while (!existsSync(ancestor) && dirname(ancestor) !== ancestor)
    ancestor = dirname(ancestor);
  const identity = resolve(realpathSync(ancestor), relative(ancestor, path));
  return process.platform === "win32" ? identity.toLowerCase() : identity;
}

export function isSameDatabaseFile(left: string, right: string) {
  if (getDatabaseFileIdentity(left) === getDatabaseFileIdentity(right))
    return true;
  if (!existsSync(left) || !existsSync(right)) return false;
  const a = statSync(left, { bigint: true });
  const b = statSync(right, { bigint: true });
  return a.ino !== 0n && a.dev === b.dev && a.ino === b.ino;
}

export function resolveDatabasePaths(paths: DatabasePaths): DatabasePaths {
  const contentPath = resolveDatabasePath(paths.contentPath);
  const usersPath = resolveDatabasePath(paths.usersPath);
  if (contentPath === ":memory:" || usersPath === ":memory:") {
    throw new RangeError(
      "The two-database application requires file-backed paths",
    );
  }
  if (isSameDatabaseFile(contentPath, usersPath)) {
    throw new RangeError("content.db and users.db must be different files");
  }
  return { contentPath, usersPath };
}

export function openDatabaseFile(path: string) {
  const client = new DatabaseSync(resolveDatabasePath(path), { timeout: 5000 });
  try {
    client.exec(
      "PRAGMA foreign_keys = ON; PRAGMA journal_mode = DELETE; PRAGMA synchronous = FULL;",
    );
    return client;
  } catch (error) {
    client.close();
    throw error;
  }
}

export function openApplicationDatabase(paths: DatabasePaths) {
  const resolved = resolveDatabasePaths(paths);
  const client = openDatabaseFile(resolved.usersPath);
  try {
    client.prepare("ATTACH DATABASE ? AS content").run(resolved.contentPath);
    client.exec(
      "PRAGMA content.journal_mode = DELETE; PRAGMA content.synchronous = FULL;",
    );
    assertDatabaseLayout(client, "main", USER_TABLES, CONTENT_TABLES);
    assertDatabaseLayout(client, "content", CONTENT_TABLES, USER_TABLES);
    assertForeignKeys(client, "main");
    assertForeignKeys(client, "content");
    assertContentReferences(client);
    installContentReferenceTriggers(client);
    client.function("normalize_search", { deterministic: true }, (value) =>
      typeof value === "string" ? normalizeSearchText(value) : null,
    );
    return drizzle({ client });
  } catch (error) {
    client.close();
    throw error;
  }
}
