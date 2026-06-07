// ─────────────────────────────────────────────
// Smart Todo — Items Store (Zustand)
// Integrates embedding generation + linking on CRUD
// ─────────────────────────────────────────────

import { create } from "zustand";
import type { Item, Task, Note, Priority, SemanticLink } from "../types/item";
import { isTask, isNote, createTaskBase, createNoteBase } from "../types/item";
import * as db from "../services/database";
import {
  generateEmbedding,
  embeddingToBuffer,
  initEmbeddings,
} from "../services/embeddings";
import { calculateAdaptiveScore } from "../services/importanceScorer";
import {
  processItemLinks,
  type LinkSuggestion,
} from "../services/linkingEngine";

// ── Store shape ────────────────────────────

interface LinkingState {
  autoLinked: SemanticLink[];
  suggestions: LinkSuggestion[];
}

interface ItemsState {
  items: Item[];
  links: SemanticLink[];
  loaded: boolean;
  loading: boolean;
  linking: LinkingState;

  // Lifecycle
  loadAll: () => Promise<void>;
  initIntelligence: () => Promise<void>;

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

  // Importance
  refreshImportanceScores: () => void;

  // Links
  loadLinks: (itemId: string) => Promise<SemanticLink[]>;
  dismissSuggestion: (fromId: string, toId: string) => void;

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
  linking: { autoLinked: [], suggestions: [] },

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

  // ── Initialize intelligence layer ─────
  initIntelligence: async () => {
    try {
      await initEmbeddings();
      console.log("[itemsStore] Intelligence layer initialized");
    } catch (err) {
      console.warn("[itemsStore] Intelligence init failed:", err);
    }
  },

  // ── Task CRUD ──────────────────────────
  addTask: async (title, priority = "medium") => {
    const task: Task = { ...createTaskBase(title, priority), subtasks: [] };
    await db.insertItem(task);
    set((s) => ({ items: [task, ...s.items] }));

    // Generate embedding + find links (fire-and-forget)
    embedAndLink(task, get().items).catch((err) =>
      console.warn("[itemsStore] embed/link failed for new task:", err)
    );

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

    // Re-embed on meaningful content changes
    if (
      updates.title !== undefined ||
      updates.content !== undefined ||
      updates.tags !== undefined
    ) {
      embedAndLink(updated, get().items).catch((err) =>
        console.warn("[itemsStore] embed/link failed for task update:", err)
      );
    }
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

    // Generate embedding + find links (fire-and-forget)
    embedAndLink(note, get().items).catch((err) =>
      console.warn("[itemsStore] embed/link failed for new note:", err)
    );

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

    // Re-embed on meaningful content changes
    if (
      updates.title !== undefined ||
      updates.content !== undefined ||
      updates.tags !== undefined
    ) {
      embedAndLink(updated, get().items).catch((err) =>
        console.warn("[itemsStore] embed/link failed for note update:", err)
      );
    }
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
    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
      // Also clean up any suggestions referencing this item
      linking: {
        ...s.linking,
        suggestions: s.linking.suggestions.filter(
          (sg) => sg.fromItem.id !== id && sg.toItem.id !== id
        ),
      },
    }));
  },

  // ── Importance ─────────────────────────
  refreshImportanceScores: () => {
    // Trigger a re-render by updating lastTouchedAt on all active tasks
    // The actual scores are computed reactively by useImportance hook
    set((s) => ({ items: [...s.items] }));
  },

  // ── Links ──────────────────────────────
  loadLinks: async (itemId) => {
    const links = await db.fetchLinksForItem(itemId);
    return links;
  },

  dismissSuggestion: (fromId, toId) => {
    set((s) => ({
      linking: {
        ...s.linking,
        suggestions: s.linking.suggestions.filter(
          (sg) =>
            !(sg.fromItem.id === fromId && sg.toItem.id === toId) &&
            !(sg.fromItem.id === toId && sg.toItem.id === fromId)
        ),
      },
    }));
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

// ── Private helpers ────────────────────────

/**
 * Fire-and-forget: generate embedding for an item and process its links.
 * Updates the store with any auto-links or suggestions found.
 */
async function embedAndLink(item: Item, allItems: Item[]): Promise<void> {
  const result = await processItemLinks(item, allItems);

  // Update item embedding in the store
  useItemsStore.setState((s) => ({
    items: s.items.map((i) =>
      i.id === item.id ? { ...i, embedding: item.embedding } : i
    ),
    linking: {
      autoLinked: [...s.linking.autoLinked, ...result.autoLinked],
      suggestions: [
        ...s.linking.suggestions,
        ...result.suggestions.filter(
          (newSg) =>
            // Deduplicate suggestions
            !s.linking.suggestions.some(
              (existing) =>
                (existing.fromItem.id === newSg.fromItem.id &&
                  existing.toItem.id === newSg.toItem.id) ||
                (existing.fromItem.id === newSg.toItem.id &&
                  existing.toItem.id === newSg.fromItem.id)
            )
        ),
      ],
    },
  }));
}
