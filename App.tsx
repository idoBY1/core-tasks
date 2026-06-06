// ─────────────────────────────────────────────
// Smart Todo — App Root
// Material 3 Design · Full-screen capture · Timing animations
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  BottomSheetModalProvider,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";

import { initDatabase } from "./src/services/database";
import { useItemsStore } from "./src/store/itemsStore";
import { useSmartDashboard } from "./src/hooks/useSmartDashboard";
import type { Item, Task, Note } from "./src/types/item";
import { isTask, isNote } from "./src/types/item";
import { colors, typography, spacing, radius, elevation } from "./src/theme";

// Dashboard
import { DashboardSection } from "./src/components/dashboard/DashboardSection";

// Capture (full-screen)
import { CaptureFAB } from "./src/components/capture/CaptureFAB";
import { TaskCaptureScreen } from "./src/components/capture/TaskCaptureScreen";
import { NoteCaptureScreen } from "./src/components/capture/NoteCaptureScreen";

// Detail (bottom sheet — for editing existing items)
import { TaskDetailSheet } from "./src/components/detail/TaskDetailSheet";
import { NoteDetailSheet } from "./src/components/detail/NoteDetailSheet";

// ── App root ───────────────────────────────

export default function App() {
  const [ready, setReady] = useState(false);
  const loadAll = useItemsStore((s) => s.loadAll);
  const archiveItem = useItemsStore((s) => s.archiveItem);
  const completeTask = useItemsStore((s) => s.completeTask);
  const items = useItemsStore((s) => s.items);

  // ── Capture screen state ───────────────
  const [captureMode, setCaptureMode] = useState<"task" | "note" | null>(null);

  // ── Detail bottom sheets (for editing) ─
  const taskDetailRef = useRef<BottomSheetModal>(null);
  const noteDetailRef = useRef<BottomSheetModal>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Dashboard
  const { cards, stats } = useSmartDashboard(items);

  // ── Init ──────────────────────────────────

  useEffect(() => {
    (async () => {
      await initDatabase();
      await loadAll();
      setReady(true);
    })();
  }, []);

  // ── Capture handlers ─────────────────────

  const openTaskCapture = useCallback(() => setCaptureMode("task"), []);
  const openNoteCapture = useCallback(() => setCaptureMode("note"), []);
  const closeCapture = useCallback(() => setCaptureMode(null), []);

  // ── Item press → detail sheet ─────────────

  const handleItemPress = useCallback((item: Item) => {
    if (isTask(item)) {
      setSelectedTask(item as Task);
      setTimeout(() => taskDetailRef.current?.present(), 50);
    } else if (isNote(item)) {
      setSelectedNote(item as Note);
      setTimeout(() => noteDetailRef.current?.present(), 50);
    }
  }, []);

  // ── Swipe handlers ────────────────────────

  const handleComplete = useCallback(
    (id: string) => { completeTask(id); },
    [completeTask]
  );

  const handleArchive = useCallback(
    (id: string) => { archiveItem(id); },
    [archiveItem]
  );

  // ── Loading ───────────────────────────────

  if (!ready) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loaderText}>Setting up…</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────

  const hasItems = items.filter((i) => i.archivedAt === null).length > 0;

  return (
    <GestureHandlerRootView style={s.root}>
      <BottomSheetModalProvider>
        <View style={s.container}>
          <StatusBar style="dark" />

          {/* ── Header ──────────────────────── */}
          <View style={s.header}>
            <Text style={s.appTitle}>Smart Todo</Text>
            <Text style={s.appSubtitle}>Capture · Organize · Review</Text>
            <View style={s.statsRow}>
              <StatPill
                label="Tasks"
                value={stats.totalTasks}
                iconName="assignment"
                color={colors.primary}
                containerColor={colors.primaryContainer}
              />
              <StatPill
                label="Done"
                value={stats.doneTasks}
                iconName="check-circle"
                color={colors.success}
                containerColor={colors.successContainer}
              />
              <StatPill
                label="Notes"
                value={stats.totalNotes}
                iconName="description"
                color={colors.noteAccent}
                containerColor={colors.noteAccentContainer}
              />
              {stats.overdueCount > 0 && (
                <StatPill
                  label="Overdue"
                  value={stats.overdueCount}
                  iconName="warning"
                  color={colors.error}
                  containerColor={colors.errorContainer}
                />
              )}
            </View>
          </View>

          {/* ── Dashboard ───────────────────── */}
          {!hasItems ? (
            <View style={s.empty}>
              <View style={s.emptyIconContainer}>
                <MaterialIcons name="auto-awesome" size={40} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>Capture something</Text>
              <Text style={s.emptyBody}>
                A task, an idea, anything.{"\n"}Tap the + button below to get started.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={s.scrollView}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {cards.map((card) => (
                <DashboardSection
                  key={card.type}
                  card={card}
                  onItemPress={handleItemPress}
                  onItemComplete={handleComplete}
                  onItemArchive={handleArchive}
                />
              ))}
              <View style={{ height: 120 }} />
            </ScrollView>
          )}

          {/* ── FAB ─────────────────────────── */}
          <CaptureFAB
            onCaptureTask={openTaskCapture}
            onCaptureNote={openNoteCapture}
          />
        </View>

        {/* ── Full-screen capture overlays ──── */}
        {captureMode === "task" && (
          <TaskCaptureScreen onClose={closeCapture} />
        )}
        {captureMode === "note" && (
          <NoteCaptureScreen onClose={closeCapture} />
        )}

        {/* ── Detail sheets (edit existing) ─── */}
        <TaskDetailSheet
          ref={taskDetailRef}
          task={selectedTask}
          onDismiss={() => setSelectedTask(null)}
        />
        <NoteDetailSheet
          ref={noteDetailRef}
          note={selectedNote}
          onDismiss={() => setSelectedNote(null)}
        />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

// ── Stat pill ──────────────────────────────

function StatPill({
  label,
  value,
  iconName,
  color,
  containerColor,
}: {
  label: string;
  value: number;
  iconName: string;
  color: string;
  containerColor: string;
}) {
  return (
    <View style={[s.pill, { backgroundColor: containerColor }]}>
      <MaterialIcons name={iconName as any} size={16} color={color} />
      <Text style={[s.pillValue, { color }]}>{value}</Text>
      <Text style={[s.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceDim },
  container: { flex: 1, backgroundColor: colors.surfaceDim },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceDim,
    gap: spacing.md,
  },
  loaderText: { ...typography.bodyLarge },

  // Header
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  appTitle: {
    ...typography.displayLarge,
  },
  appSubtitle: {
    ...typography.labelLarge,
    color: colors.onSurfaceMuted,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  pillValue: { ...typography.labelMedium, fontWeight: "700" },
  pillLabel: { ...typography.labelMedium },

  // Empty state
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    ...typography.titleLarge,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodyLarge,
    textAlign: "center",
    lineHeight: 24,
  },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: spacing.lg },
});
