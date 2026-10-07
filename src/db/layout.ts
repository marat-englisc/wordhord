import type { DatabaseSync } from "node:sqlite";

export const CONTENT_TABLES = [
  "deck", "attribute", "card", "card_meaning", "card_example", "card_meaning_attribute",
  "rule", "rule_image", "rule_section", "rule_section_example", "rule_section_primary_info",
] as const;

export const USER_TABLES = [
  "user", "user_deck", "user_card_meaning", "user_card_meaning_review",
  "user_rule", "user_rule_comment",
] as const;

export const CONTENT_REFERENCES = [
  { table: "user_deck", column: "deck_id", parent: "deck" },
  { table: "user_card_meaning", column: "card_meaning_id", parent: "card_meaning" },
  { table: "user_rule", column: "rule_id", parent: "rule" },
  { table: "user_rule_comment", column: "rule_id", parent: "rule" },
] as const;

export function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function getTableNames(client: DatabaseSync, schema = "main"): string[] {
  return client.prepare(`SELECT name FROM ${quoteIdentifier(schema)}.sqlite_schema WHERE type = 'table'`)
    .all().map((row) => String(row.name));
}

export function assertDatabaseLayout(
  client: DatabaseSync, schema: string, tables: readonly string[],
  otherTables: readonly string[], requireTables = true,
) {
  const names = new Set(getTableNames(client, schema));
  const misplaced = otherTables.filter((table) => names.has(table));
  if (misplaced.length) {
    throw new Error(`${schema}: tables belong in the other database: ${misplaced.join(", ")}. Check the content and user database paths.`);
  }
  const missing = tables.filter((table) => !names.has(table));
  if (requireTables && missing.length) {
    throw new Error(`${schema}: missing tables: ${missing.join(", ")}. Run npm run db:migrate first.`);
  }
}

export function assertForeignKeys(client: DatabaseSync, schema: string) {
  const violation = client.prepare(`PRAGMA ${quoteIdentifier(schema)}.foreign_key_check`).get();
  if (violation) throw new Error(`${schema}: foreign key violation in ${violation.table}, row ${violation.rowid}`);
}

export function assertContentReferences(client: DatabaseSync) {
  for (const { table, column, parent } of CONTENT_REFERENCES) {
    const missing = client.prepare(`
      SELECT child.id, child.${quoteIdentifier(column)} AS content_id
      FROM main.${quoteIdentifier(table)} AS child
      LEFT JOIN content.${quoteIdentifier(parent)} AS parent
        ON parent.id = child.${quoteIdentifier(column)}
      WHERE parent.id IS NULL LIMIT 1
    `).get();
    if (missing) {
      throw new Error(`Content reference missing: ${table} row ${missing.id} refers to ${parent} ${missing.content_id}. Use the matching content.db; content IDs must remain stable.`);
    }
  }
}

/** SQLite cannot persist foreign keys across files. These guards belong to the connection. */
export function installContentReferenceTriggers(client: DatabaseSync) {
  for (const { table, column, parent } of CONTENT_REFERENCES) {
    for (const event of ["INSERT", `UPDATE OF ${quoteIdentifier(column)}`]) {
      const suffix = event === "INSERT" ? "insert" : "update";
      client.exec(`CREATE TEMP TRIGGER ${quoteIdentifier(`content_ref_${table}_${suffix}`)}
        BEFORE ${event} ON main.${quoteIdentifier(table)}
        WHEN NOT EXISTS (SELECT 1 FROM content.${quoteIdentifier(parent)} WHERE id = NEW.${quoteIdentifier(column)})
        BEGIN SELECT RAISE(ABORT, 'Content reference missing: ${table}.${column}'); END;`);
    }
    client.exec(`CREATE TEMP TRIGGER ${quoteIdentifier(`content_delete_${table}`)}
      AFTER DELETE ON content.${quoteIdentifier(parent)}
      BEGIN DELETE FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} = OLD.id; END;`);
    // Referenced content IDs must remain stable.
    client.exec(`CREATE TEMP TRIGGER ${quoteIdentifier(`content_id_${table}`)}
      BEFORE UPDATE OF id ON content.${quoteIdentifier(parent)}
      WHEN NEW.id <> OLD.id AND EXISTS (
        SELECT 1 FROM main.${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} = OLD.id
      )
      BEGIN SELECT RAISE(ABORT, 'Referenced content IDs cannot change'); END;`);
  }
}
