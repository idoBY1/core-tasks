// ─────────────────────────────────────────────
// Smart Todo — SQLite Database Service
// ─────────────────────────────────────────────

import * as SQLite from "expo-sqlite";
import type { Item, Task, Note, SemanticLink } from "../types/item";
import { isTask, isNote } from "../types/item";

let db: SQLite.SQLiteDatabase | null = null;

// ── Initialisation ─────────────────────────

/**
 * Opens (or reuses) the database and runs pending migrations.
 * Must be called once at app startup before any other DB function.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync("smarttodo.db");

  // Enable WAL mode for better concurrent read performance
  await db.execAsync("PRAGMA journal_mode = WAL;");

  await runMigrations(db);
  return db;
}

/** Returns the current database handle — throws if not initialised. */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) throw new Error("Database not initialised — call initDatabase() first.");
  return db;
}

// ── Migrations ─────────────────────────────

const MIGRATIONS: ((db: SQLite.SQLiteDatabase) => Promise<void>)[] = [
  // Migration 0 — initial schema
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id                TEXT PRIMARY KEY,
        type              TEXT NOT NULL CHECK(type IN ('task', 'note')),
        title             TEXT NOT NULL,
        content           TEXT DEFAULT '',
        media             TEXT DEFAULT '[]',
        embedding         BLOB,
        tags              TEXT DEFAULT '[]',
        user_priority     TEXT CHECK(user_priority IN ('low','medium','high','critical')),
        importance        REAL DEFAULT 0.5,
        color             TEXT,
        pinned            INTEGER DEFAULT 0,
        status            TEXT DEFAULT 'pending',
        due_date          TEXT,
        is_all_day        INTEGER DEFAULT 1,
        recurrence        TEXT,
        parent_id         TEXT REFERENCES items(id),
        checklist         TEXT,
        source            TEXT DEFAULT 'manual',
        completed_at      TEXT,
        archived_at       TEXT,
        last_touched_at   TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_items_type      ON items(type);
      CREATE INDEX IF NOT EXISTS idx_items_status    ON items(status);
      CREATE INDEX IF NOT EXISTS idx_items_due_date  ON items(due_date);
      CREATE INDEX IF NOT EXISTS idx_items_importance ON items(importance);
      CREATE INDEX IF NOT EXISTS idx_items_parent    ON items(parent_id);
      CREATE INDEX IF NOT EXISTS idx_items_archived  ON items(archived_at);

      CREATE TABLE IF NOT EXISTS semantic_links (
        id              TEXT PRIMARY KEY,
        from_id         TEXT NOT NULL REFERENCES items(id),
        to_id           TEXT NOT NULL REFERENCES items(id),
        similarity      REAL NOT NULL,
        auto_generated  INTEGER DEFAULT 1,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(from_id, to_id)
      );

      CREATE INDEX IF NOT EXISTS idx_links_from ON semantic_links(from_id);
      CREATE INDEX IF NOT EXISTS idx_links_to   ON semantic_links(to_id);

      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  },
];

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Ensure migrations table exists first
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    "SELECT version FROM migrations ORDER BY version"
  );
  const appliedSet = new Set(applied.map((r) => r.version));

  for (let i = 0; i < MIGRATIONS.length; i++) {
    if (!appliedSet.has(i)) {
      await MIGRATIONS[i](db);
      await db.runAsync("INSERT INTO migrations (version) VALUES (?)", [i]);
    }
  }
}

// ── Row ↔ Model mapping ────────────────────

function rowToItem(row: Record<string, any>): Item {
  const base = {
    id: row.id as string,
    title: row.title as string,
    content: (row.content as string) ?? "",
    media: JSON.parse((row.media as string) ?? "[]"),
    embedding: row.embedding ? Array.from(new Float32Array(row.embedding)) : null,
    tags: JSON.parse((row.tags as string) ?? "[]"),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: (row.archived_at as string) ?? null,
    links: [] as SemanticLink[], // loaded separately if needed
    lastTouchedAt: (row.last_touched_at as string) ?? null,
  };

  if (row.type === "task") {
    return {
      ...base,
      type: "task" as const,
      userPriority: (row.user_priority as Task["userPriority"]) ?? "medium",
      importance: (row.importance as number) ?? 0.5,
      dueDate: (row.due_date as string) ?? null,
      isAllDay: Boolean(row.is_all_day),
      recurrence: row.recurrence ? JSON.parse(row.recurrence as string) : null,
      parentId: (row.parent_id as string) ?? null,
      subtasks: [], // loaded on demand
      completedSubtasks: 0, // computed on demand
      completedAt: (row.completed_at as string) ?? null,
      status: (row.status as Task["status"]) ?? "pending",
    };
  }

  return {
    ...base,
    type: "note" as const,
    pinned: Boolean(row.pinned),
    color: (row.color as string) ?? "#FFFFFF",
    checklist: row.checklist ? JSON.parse(row.checklist as string) : null,
    source: (row.source as Note["source"]) ?? "manual",
  };
}

// ── CRUD Operations ────────────────────────

/** Insert a new item (task or note). */
export async function insertItem(item: Item): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (isTask(item)) {
    await db.runAsync(
      `INSERT INTO items (
        id, type, title, content, media, tags,
        user_priority, importance, status, due_date, is_all_day,
        recurrence, parent_id, completed_at, last_touched_at,
        created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        item.id,
        "task",
        item.title,
        item.content,
        JSON.stringify(item.media),
        JSON.stringify(item.tags),
        item.userPriority,
        item.importance,
        item.status,
        item.dueDate,
        item.isAllDay ? 1 : 0,
        item.recurrence ? JSON.stringify(item.recurrence) : null,
        item.parentId,
        item.completedAt,
        item.lastTouchedAt ?? now,
        item.createdAt || now,
        item.updatedAt || now,
      ]
    );
  } else if (isNote(item)) {
    await db.runAsync(
      `INSERT INTO items (
        id, type, title, content, media, tags,
        pinned, color, checklist, source, last_touched_at,
        created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        item.id,
        "note",
        item.title,
        item.content,
        JSON.stringify(item.media),
        JSON.stringify(item.tags),
        item.pinned ? 1 : 0,
        item.color,
        item.checklist ? JSON.stringify(item.checklist) : null,
        item.source,
        item.lastTouchedAt ?? now,
        item.createdAt || now,
        item.updatedAt || now,
      ]
    );
  }
}

/** Fetch all non-archived items, ordered by updated_at descending. */
export async function fetchAllItems(): Promise<Item[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<Record<string, any>>(
    "SELECT * FROM items WHERE archived_at IS NULL ORDER BY updated_at DESC"
  );
  return rows.map(rowToItem);
}

/** Fetch a single item by id, or null if not found. */
export async function fetchItemById(id: string): Promise<Item | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<Record<string, any>>(
    "SELECT * FROM items WHERE id = ?",
    [id]
  );
  return row ? rowToItem(row) : null;
}

/** Fetch subtasks of a given parent task. */
export async function fetchSubtasks(parentId: string): Promise<Task[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<Record<string, any>>(
    "SELECT * FROM items WHERE parent_id = ? AND type = 'task' ORDER BY created_at ASC",
    [parentId]
  );
  return rows.map(rowToItem).filter(isTask);
}

/** Update mutable fields of an existing item. */
export async function updateItem(item: Item): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (isTask(item)) {
    await db.runAsync(
      `UPDATE items SET
        title = ?, content = ?, media = ?, tags = ?,
        user_priority = ?, importance = ?, status = ?,
        due_date = ?, is_all_day = ?, recurrence = ?,
        parent_id = ?, completed_at = ?, last_touched_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        item.title,
        item.content,
        JSON.stringify(item.media),
        JSON.stringify(item.tags),
        item.userPriority,
        item.importance,
        item.status,
        item.dueDate,
        item.isAllDay ? 1 : 0,
        item.recurrence ? JSON.stringify(item.recurrence) : null,
        item.parentId,
        item.completedAt,
        item.lastTouchedAt ?? now,
        now,
        item.id,
      ]
    );
  } else if (isNote(item)) {
    await db.runAsync(
      `UPDATE items SET
        title = ?, content = ?, media = ?, tags = ?,
        pinned = ?, color = ?, checklist = ?, source = ?,
        last_touched_at = ?, updated_at = ?
      WHERE id = ?`,
      [
        item.title,
        item.content,
        JSON.stringify(item.media),
        JSON.stringify(item.tags),
        item.pinned ? 1 : 0,
        item.color,
        item.checklist ? JSON.stringify(item.checklist) : null,
        item.source,
        item.lastTouchedAt ?? now,
        now,
        item.id,
      ]
    );
  }
}

/** Soft-delete: set archivedAt to now. */
export async function archiveItem(id: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE items SET archived_at = ?, updated_at = ? WHERE id = ?",
    [now, now, id]
  );
}

/** Permanently delete an item and its semantic links. */
export async function deleteItem(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync("DELETE FROM semantic_links WHERE from_id = ? OR to_id = ?", [id, id]);
  await db.runAsync("DELETE FROM items WHERE id = ?", [id]);
}

// ── Semantic Links ─────────────────────────

export async function insertSemanticLink(link: SemanticLink): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO semantic_links (id, from_id, to_id, similarity, auto_generated, created_at)
     VALUES (?,?,?,?,?,?)`,
    [link.id, link.fromId, link.toId, link.similarity, link.autoGenerated ? 1 : 0, link.createdAt]
  );
}

export async function fetchLinksForItem(itemId: string): Promise<SemanticLink[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<Record<string, any>>(
    "SELECT * FROM semantic_links WHERE from_id = ? OR to_id = ?",
    [itemId, itemId]
  );
  return rows.map((r) => ({
    id: r.id as string,
    fromId: r.from_id as string,
    toId: r.to_id as string,
    similarity: r.similarity as number,
    autoGenerated: Boolean(r.auto_generated),
    createdAt: r.created_at as string,
  }));
}
