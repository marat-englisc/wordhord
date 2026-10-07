import { sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export function getPagination(options: PaginationOptions) {
  for (const [key, value] of Object.entries({
    limit: options.limit,
    offset: options.offset,
  })) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw new RangeError(`${key} must be a non-negative safe integer`);
    }
  }

  return {
    limit: options.limit ?? Number.MAX_SAFE_INTEGER,
    offset: options.offset ?? 0,
  };
}

export function validateUpdate(
  data: object,
  immutableKeys: readonly string[] = [],
) {
  const entries = Object.entries(data).filter(
    ([, value]) => value !== undefined,
  );
  if (entries.length === 0) {
    throw new Error("Update data must contain at least one defined value");
  }

  const protectedKeys = ["id", "createdAt", "updatedAt", ...immutableKeys];
  if (entries.some(([key]) => protectedKeys.includes(key))) {
    throw new Error("Update data contains an immutable field");
  }
}

export function containsText(column: AnySQLiteColumn, value: string) {
  return sql`instr(normalize_search(${column}), normalize_search(${value})) > 0`;
}

export function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}
