import { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { initDatabase } from "./src/services/database";
import { useItemsStore } from "./src/store/itemsStore";
import { isTask, isNote } from "./src/types/item";
import type { Item, Task, Note, Priority } from "./src/types/item";
import { displayDate, isOverdue } from "./src/utils/dateUtils";

// ── Priority badge colour ──────────────────

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

// ── App root ───────────────────────────────

export default function App() {
  const [ready, setReady] = useState(false);
  const loadAll = useItemsStore((s) => s.loadAll);
  const addTask = useItemsStore((s) => s.addTask);
  const addNote = useItemsStore((s) => s.addNote);
  const completeTask = useItemsStore((s) => s.completeTask);
  const deleteItem = useItemsStore((s) => s.deleteItem);
  const items = useItemsStore((s) => s.items);

  useEffect(() => {
    (async () => {
      await initDatabase();
      await loadAll();
      setReady(true);
    })();
  }, []);

  // ── Quick-add handlers ─────────────────

  const handleAddTask = useCallback(() => {
    addTask("New task", "medium");
  }, [addTask]);

  const handleAddNote = useCallback(() => {
    addNote("New note");
  }, [addNote]);

  const handleComplete = useCallback(
    (id: string) => {
      completeTask(id);
    },
    [completeTask]
  );

  const handleDelete = useCallback(
    (item: Item) => {
      Alert.alert("Delete?", `Delete "${item.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteItem(item.id),
        },
      ]);
    },
    [deleteItem]
  );

  // ── Render ─────────────────────────────

  if (!ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
        <Text style={styles.loaderText}>Setting up…</Text>
      </View>
    );
  }

  const activeItems = items.filter((i) => i.archivedAt === null);
  const tasks = activeItems.filter(isTask);
  const notes = activeItems.filter(isNote);

  return (
    <View style={styles.container}>
      <StatusBar />

      {/* ── Header ─────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Smart Todo</Text>
        <Text style={styles.subtitle}>
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} · {notes.length} note
          {notes.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* ── Item list ──────────────────── */}
      {activeItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyBody}>
            Tap a button below to capture a task or note.
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeItems}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          )}
        />
      )}

      {/* ── FAB row ────────────────────── */}
      <View style={styles.fabRow}>
        <TouchableOpacity style={[styles.fab, styles.fabTask]} onPress={handleAddTask}>
          <Text style={styles.fabLabel}>＋ Task</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, styles.fabNote]} onPress={handleAddNote}>
          <Text style={styles.fabLabel}>＋ Note</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Item row component ─────────────────────

function ItemRow({
  item,
  onComplete,
  onDelete,
}: {
  item: Item;
  onComplete: (id: string) => void;
  onDelete: (item: Item) => void;
}) {
  const task = isTask(item) ? (item as Task) : null;
  const note = isNote(item) ? (item as Note) : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={() => onDelete(item)}
      activeOpacity={0.7}
    >
      {/* Left accent bar */}
      {task && (
        <View
          style={[
            styles.accent,
            { backgroundColor: PRIORITY_COLORS[task.userPriority] },
          ]}
        />
      )}
      {note && <View style={[styles.accent, { backgroundColor: "#6366f1" }]} />}

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>

        {task && (
          <View style={styles.metaRow}>
            {task.dueDate && (
              <Text
                style={[
                  styles.meta,
                  isOverdue(task.dueDate) && styles.metaOverdue,
                ]}
              >
                📅 {displayDate(task.dueDate)}
              </Text>
            )}
            <Text style={[styles.meta, { color: PRIORITY_COLORS[task.userPriority] }]}>
              {task.userPriority.toUpperCase()}
            </Text>
            <Text style={styles.meta}>{task.status}</Text>
          </View>
        )}

        {note && note.content ? (
          <Text style={styles.notePreview} numberOfLines={2}>
            {note.content}
          </Text>
        ) : null}
      </View>

      {/* Complete button for tasks */}
      {task && task.status !== "done" && (
        <TouchableOpacity
          style={styles.checkBtn}
          onPress={() => onComplete(task.id)}
        >
          <Text style={styles.checkIcon}>✓</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 12, color: "#64748b" },

  // Header
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },

  // Empty state
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#334155", marginTop: 16 },
  emptyBody: { fontSize: 14, color: "#94a3b8", textAlign: "center", marginTop: 8 },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 100 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  accent: { width: 4, alignSelf: "stretch" },
  cardBody: { flex: 1, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  metaRow: { flexDirection: "row", marginTop: 6, gap: 10 },
  meta: { fontSize: 12, color: "#94a3b8" },
  metaOverdue: { color: "#ef4444" },
  notePreview: { fontSize: 13, color: "#64748b", marginTop: 4 },

  // Check button
  checkBtn: { padding: 16 },
  checkIcon: { fontSize: 20, color: "#22c55e", fontWeight: "700" },

  // FAB
  fabRow: {
    position: "absolute",
    bottom: 40,
    right: 20,
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-end",
  },
  fab: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabTask: { backgroundColor: "#3b82f6" },
  fabNote: { backgroundColor: "#6366f1" },
  fabLabel: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
