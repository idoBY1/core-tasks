// ─────────────────────────────────────────────
// Smart Todo — Items Store (Zustand)
// ─────────────────────────────────────────────

import { create } from "zustand";
import type { Item, Task, Note, Priority, SemanticLink } from "../types/item";
import { isTask, isNote, createTaskBase, createNoteBase } from "../types/item";
import * as db from "../services/database";

// ── Store shape ────────────────────────────

interface ItemsState {
  items: Item[];
  links: SemanticLink[];
  loaded: boolean;
  loading: boolean;

  // Lifecycle
  loadAll: () => Promise<void>;

  // Task CRUD
  addTask: (title: string, priority?: Priority) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;

  // Note CRUD
  addNote: (title: string) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;

  // Generic
  archiveItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Links
  loadLinks: (itemId: string) => Promise<SemanticLink[]>;

  // Selectors
  getTask: (id: string) => Task | undefined;
  getNote: (id: string) => Note | undefined;
  getActiveItems: () => Item[];
  getActiveTasks: () => Task[];
  getActiveNotes: () => Note[];
}

// ── Store implementation ───────────────────

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  links: [],
  loaded: false,
  loading: false,

  // ── Load everything from SQLite ────────
  loadAll: async () => {
    set({ loading: true });
    try {
      const items = await db.fetchAllItems();
      set({ items, loaded: true, loading: false });
    } catch (e) {
      console.error("[itemsStore] loadAll failed:", e);
      set({ loading: false });
    }
  },

  // ── Task CRUD ──────────────────────────
  addTask: async (title, priority = "medium") => {
    const task: Task = { ...createTaskBase(title, priority), subtasks: [] };
    await db.insertItem(task);
    set((s) => ({ items: [task, ...s.items] }));
    return task;
  },

  updateTask: async (id, updates) => {
    const existing = get().items.find((i) => i.id === id);
    if (!existing || !isTask(existing)) return;

    const updated: Task = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      lastTouchedAt: new Date().toISOString(),
    };

    await db.updateItem(updated);
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? updated : i)),
    }));
  },

  completeTask: async (id) => {
    const existing = get().items.find((i) => i.id === id);
    if (!existing || !isTask(existing)) return;

    const now = new Date().toISOString();
    const updated: Task = {
      ...existing,
      status: "done",
      completedAt: now,
      updatedAt: now,
      lastTouchedAt: now,
    };

    await db.updateItem(updated);
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? updated : i)),
    }));
  },

  // ── Note CRUD ──────────────────────────
  addNote: async (title) => {
    const note: Note = { ...createNoteBase(title), checklist: null };
    await db.insertItem(note);
    set((s) => ({ items: [note, ...s.items] }));
    return note;
  },

  updateNote: async (id, updates) => {
    const existing = get().items.find((i) => i.id === id);
    if (!existing || !isNote(existing)) return;

    const updated: Note = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      lastTouchedAt: new Date().toISOString(),
    };

    await db.updateItem(updated);
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? updated : i)),
    }));
  },

  // ── Generic ────────────────────────────
  archiveItem: async (id) => {
    await db.archiveItem(id);
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, archivedAt: new Date().toISOString() } : i
      ),
    }));
  },

  deleteItem: async (id) => {
    await db.deleteItem(id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  // ── Links ──────────────────────────────
  loadLinks: async (itemId) => {
    const links = await db.fetchLinksForItem(itemId);
    return links;
  },

  // ── Selectors ──────────────────────────
  getTask: (id) => {
    const item = get().items.find((i) => i.id === id);
    return item && isTask(item) ? item : undefined;
  },

  getNote: (id) => {
    const item = get().items.find((i) => i.id === id);
    return item && isNote(item) ? item : undefined;
  },

  getActiveItems: () =>
    get().items.filter((i) => i.archivedAt === null),

  getActiveTasks: () =>
    get().items.filter((i) => i.type === "task" && i.archivedAt === null) as Task[],

  getActiveNotes: () =>
    get().items.filter((i) => i.type === "note" && i.archivedAt === null) as Note[],
}));
