// ─────────────────────────────────────────────
// Smart Todo — Task Detail Sheet
// No switches — date row with x to clear.
// Due date only for non-recurring tasks.
// Recurrence: daily=no date, weekly=day chips,
// monthly=multi-day grid, none=free date.
// Time picker: any minute of the day.
// ─────────────────────────────────────────────

import React, { useState, useCallback, useEffect, forwardRef, useMemo } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import type { Task, Priority, TaskStatus, DayOfWeek } from "../../types/item";
import { ImportanceSelector } from "../capture/ImportanceSelector";
import { DatePickerModal, DateChip } from "../capture/DatePicker";
import { TimePickerModal, TimeChip } from "../capture/TimePicker";
import { RecurrencePicker, type RecurrenceValue } from "../capture/RecurrencePicker";
import { ImportanceBadge } from "../shared/ImportanceBadge";
import { useItemsStore } from "../../store/itemsStore";
import { relativeTime } from "../../utils/dateUtils";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, typography, spacing, radius, elevation, motion } from "../../theme";
import { format } from "date-fns";

interface Props {
  task: Task | null;
  onDismiss?: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: colors.onSurfaceMuted },
  { value: "in_progress", label: "In Progress", color: colors.primary },
  { value: "waiting", label: "Waiting", color: colors.warning },
  { value: "done", label: "Done", color: colors.success },
];

function toRecurrenceValue(task: Task): RecurrenceValue {
  const r = task.recurrence;
  if (!r) return { frequency: "none", daysOfWeek: [], daysOfMonth: [] };
  return {
    frequency: r.frequency === "yearly" || r.frequency === "custom" ? "none" : r.frequency,
    daysOfWeek: (r.daysOfWeek as DayOfWeek[]) ?? [],
    daysOfMonth: r.daysOfMonth ?? (r.dayOfMonth ? [r.dayOfMonth] : []),
  };
}

function toTimeStr(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export const TaskDetailSheet = forwardRef<BottomSheetModal, Props>(
  ({ task, onDismiss }, ref) => {
    const updateTask = useItemsStore((s) => s.updateTask);
    const deleteItem = useItemsStore((s) => s.deleteItem);
    const completeTask = useItemsStore((s) => s.completeTask);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [priority, setPriority] = useState<Priority>("medium");
    const [status, setStatus] = useState<TaskStatus>("pending");
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [selectedTime, setSelectedTime] = useState("09:00");
    const [hasTime, setHasTime] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [recurrence, setRecurrence] = useState<RecurrenceValue>({
      frequency: "none",
      daysOfWeek: [],
      daysOfMonth: [],
    });

    const snapPoints = useMemo(() => ["90%"], []);

    // Sync from task
    useEffect(() => {
      if (task) {
        setTitle(task.title);
        setContent(task.content);
        setPriority(task.userPriority);
        setStatus(task.status);
        setRecurrence(toRecurrenceValue(task));
        if (task.dueDate) {
          const d = new Date(task.dueDate);
          setDueDate(d);
          if (!task.isAllDay) {
            setSelectedTime(toTimeStr(d));
            setHasTime(true);
          } else {
            setSelectedTime("09:00");
            setHasTime(false);
          }
        } else {
          setDueDate(null);
          setSelectedTime("09:00");
          setHasTime(false);
        }
      }
    }, [task]);

    const save = useCallback(async () => {
      if (!task || !title.trim()) return;
      const updates: Record<string, any> = {
        title: title.trim(),
        content: content.trim(),
        userPriority: priority,
        status,
      };

      // Due date — only for non-recurring tasks
      if (recurrence.frequency === "none" && dueDate) {
        const d = new Date(dueDate);
        if (hasTime) {
          const [h, m] = selectedTime.split(":").map(Number);
          d.setHours(h, m, 0, 0);
          updates.isAllDay = false;
        } else {
          updates.isAllDay = true;
        }
        updates.dueDate = d.toISOString();
      } else {
        updates.dueDate = null;
        updates.isAllDay = true;
      }

      // Recurrence
      if (recurrence.frequency !== "none") {
        updates.recurrence = {
          frequency: recurrence.frequency,
          interval: 1,
          daysOfWeek: recurrence.daysOfWeek.length > 0 ? recurrence.daysOfWeek : null,
          daysOfMonth: recurrence.daysOfMonth.length > 0 ? recurrence.daysOfMonth : null,
        };
      } else {
        updates.recurrence = null;
      }

      await updateTask(task.id, updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [task, title, content, priority, status, dueDate, selectedTime, hasTime, recurrence, updateTask]);

    const handleDismiss = useCallback(() => {
      save();
      onDismiss?.();
    }, [save, onDismiss]);

    const handleDelete = useCallback(() => {
      if (!task) return;
      Alert.alert("Delete Task?", `Delete "${task.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteItem(task.id);
            if (ref && typeof ref === "object" && ref.current) ref.current.dismiss();
          },
        },
      ]);
    }, [task, deleteItem, ref]);

    const handleComplete = useCallback(async () => {
      if (!task) return;
      await completeTask(task.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (ref && typeof ref === "object" && ref.current) ref.current.dismiss();
    }, [task, completeTask, ref]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      []
    );

    if (!task) return null;

    const showDateSection = recurrence.frequency === "none";

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.indicator}
        backgroundStyle={styles.sheetBg}
        onDismiss={handleDismiss}
        enableDynamicSizing={false}
      >
        <BottomSheetScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <ImportanceBadge priority={priority} />
            <Text style={typography.labelMedium}>Created {relativeTime(task.createdAt)}</Text>
          </View>

          {/* Title */}
          <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="Task title" placeholderTextColor={colors.onSurfaceMuted} multiline />

          {/* Description */}
          <TextInput style={styles.descInput} value={content} onChangeText={setContent} placeholder="Add notes or description…" placeholderTextColor={colors.onSurfaceMuted} multiline numberOfLines={4} textAlignVertical="top" />

          {/* Status */}
          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.statusBtn, status === opt.value && { backgroundColor: opt.color }]}
                onPress={() => setStatus(opt.value)}
              >
                <Text style={[styles.statusLabel, status === opt.value && { color: colors.onPrimary }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Importance */}
          <Text style={styles.fieldLabel}>Importance</Text>
          <ImportanceSelector value={priority} onChange={setPriority} />

          {/* ── Due Date (only when no recurrence) ── */}
          {showDateSection && (
            <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)}>
              <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>Due Date</Text>
              {dueDate ? (
                <DateChip
                  date={dueDate}
                  onPress={() => setShowDateModal(true)}
                  onClear={() => { setDueDate(null); setHasTime(false); }}
                />
              ) : (
                <TouchableOpacity style={styles.addRow} onPress={() => setShowDateModal(true)} activeOpacity={0.6}>
                  <MaterialIcons name="event" size={18} color={colors.primary} />
                  <Text style={styles.addText}>Set date</Text>
                </TouchableOpacity>
              )}

              <DatePickerModal
                visible={showDateModal}
                value={dueDate}
                onConfirm={(d) => { setDueDate(d); setShowDateModal(false); }}
                onCancel={() => setShowDateModal(false)}
              />

              {/* Time picker — only if date chosen */}
              {dueDate && (
                <Animated.View entering={FadeIn.duration(motion.fast)}>
                  {!hasTime ? (
                    <TouchableOpacity
                      style={styles.addRow}
                      onPress={() => setShowTimeModal(true)}
                      activeOpacity={0.6}
                    >
                      <MaterialIcons name="schedule" size={18} color={colors.primary} />
                      <Text style={styles.addText}>Add time</Text>
                    </TouchableOpacity>
                  ) : (
                    <TimeChip
                      time={selectedTime}
                      onPress={() => setShowTimeModal(true)}
                      onClear={() => setHasTime(false)}
                    />
                  )}

                  <TimePickerModal
                    visible={showTimeModal}
                    value={selectedTime}
                    onConfirm={(t) => { setSelectedTime(t); setHasTime(true); setShowTimeModal(false); }}
                    onCancel={() => setShowTimeModal(false)}
                  />
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* ── Recurrence ───────────────────── */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>Repeat</Text>
          <RecurrencePicker value={recurrence} onChange={setRecurrence} />

          {/* Actions */}
          <View style={styles.actionsRow}>
            {task.status !== "done" && (
              <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
                <View style={styles.actionIconRow}>
                  <MaterialIcons name="check" size={16} color={colors.onPrimary} />
                  <Text style={styles.completeBtnText}>Mark Done</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <View style={styles.actionIconRow}>
                <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </View>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

TaskDetailSheet.displayName = "TaskDetailSheet";

const styles = StyleSheet.create({
  indicator: { backgroundColor: colors.outlineVariant, width: 40 },
  sheetBg: { backgroundColor: colors.surface },
  content: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  titleInput: {
    ...typography.titleLarge,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  descInput: {
    ...typography.bodyLarge,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 80,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    ...typography.labelLarge,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
  },
  statusLabel: {
    ...typography.labelMedium,
  },

  // Date / Time rows
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  addText: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: "600",
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  completeBtn: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    alignItems: "center",
  },
  completeBtnText: {
    color: colors.onPrimary,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "700",
  },
  actionIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    backgroundColor: colors.errorContainer,
    alignItems: "center",
  },
  deleteBtnText: {
    color: colors.error,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "700",
  },
});
