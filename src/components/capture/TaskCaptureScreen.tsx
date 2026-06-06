// ─────────────────────────────────────────────
// Smart Todo — Task Capture Screen
// No switches — tap date row to add, x to clear.
// Recurrence-aware: daily = no date, weekly = pick days,
// monthly = pick day number, none = free date.
// ─────────────────────────────────────────────

import React, { useState, useCallback } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Animated, { SlideInDown, FadeIn, FadeOut } from "react-native-reanimated";
import type { Priority, DayOfWeek } from "../../types/item";
import { ImportanceSelector } from "./ImportanceSelector";
import { DatePicker } from "./DatePicker";
import { RecurrencePicker, type RecurrenceValue } from "./RecurrencePicker";
import { useItemsStore } from "../../store/itemsStore";
import { colors, typography, spacing, radius, elevation, motion } from "../../theme";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";

interface Props {
  onClose: () => void;
}

const TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

export function TaskCaptureScreen({ onClose }: Props) {
  const addTask = useItemsStore((s) => s.addTask);
  const updateTask = useItemsStore((s) => s.updateTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({
    frequency: "none",
    daysOfWeek: [],
    dayOfMonth: null,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!title.trim() || saving) return;
    setSaving(true);

    try {
      const task = await addTask(title.trim(), priority);

      const updates: Record<string, any> = {};
      if (description.trim()) updates.content = description.trim();

      // Due date — skip for daily (no date needed)
      if (recurrence.frequency === "daily") {
        // no due date for daily tasks
      } else if (recurrence.frequency === "weekly" && recurrence.daysOfWeek.length > 0) {
        const today = new Date();
        const nextOccurrence = new Date(today);
        const targetDay = recurrence.daysOfWeek[0];
        const diff = (targetDay - today.getDay() + 7) % 7 || 7;
        nextOccurrence.setDate(today.getDate() + diff);
        updates.dueDate = nextOccurrence.toISOString();
        updates.isAllDay = !selectedTime;
      } else if (recurrence.frequency === "monthly" && recurrence.dayOfMonth) {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth() + 1, recurrence.dayOfMonth);
        updates.dueDate = target.toISOString();
        updates.isAllDay = !selectedTime;
      } else if (dueDate) {
        const d = new Date(dueDate);
        if (selectedTime) {
          const [h, m] = selectedTime.split(":").map(Number);
          d.setHours(h, m, 0, 0);
          updates.isAllDay = false;
        } else {
          updates.isAllDay = true;
        }
        updates.dueDate = d.toISOString();
      }

      // Recurrence
      if (recurrence.frequency !== "none") {
        updates.recurrence = {
          frequency: recurrence.frequency,
          interval: 1,
          daysOfWeek: recurrence.daysOfWeek.length > 0 ? recurrence.daysOfWeek : null,
          dayOfMonth: recurrence.dayOfMonth,
        };
      }

      if (Object.keys(updates).length > 0) {
        await updateTask(task.id, updates);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      console.error("[TaskCaptureScreen] save failed:", e);
      setSaving(false);
    }
  }, [title, description, priority, dueDate, selectedTime, recurrence, saving, addTask, updateTask, onClose]);

  const canSave = !!title.trim() && !saving;
  const showDateSection = recurrence.frequency !== "daily";

  return (
    <Animated.View style={styles.screen} entering={SlideInDown.duration(motion.normal)}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Task</Text>
          <TouchableOpacity onPress={handleSave} disabled={!canSave} style={styles.headerBtn}>
            <Text style={[styles.saveBtnText, !canSave && styles.saveBtnDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <TextInput
            style={styles.titleInput}
            placeholder="What needs to be done?"
            placeholderTextColor={colors.onSurfaceMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />

          {/* Description */}
          <TextInput
            style={styles.descInput}
            placeholder="Add details (optional)"
            placeholderTextColor={colors.onSurfaceMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Importance */}
          <Text style={styles.label}>Importance</Text>
          <ImportanceSelector value={priority} onChange={setPriority} />

          {/* ── Due Date ─────────────────────── */}
          {showDateSection && (
            <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)}>
              <Text style={[styles.label, { marginTop: spacing.xl }]}>Due Date</Text>
              {dueDate ? (
                <View style={styles.dateSelectedRow}>
                  <MaterialIcons name="event" size={18} color={colors.primary} />
                  <Text style={styles.dateSelectedText}>{format(dueDate, "EEE, MMM d, yyyy")}</Text>
                  <TouchableOpacity onPress={() => { setDueDate(null); setSelectedTime(null); setShowDatePicker(false); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={18} color={colors.onSurfaceMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.dateAddRow} onPress={() => setShowDatePicker(true)} activeOpacity={0.6}>
                  <MaterialIcons name="add" size={18} color={colors.primary} />
                  <Text style={styles.dateAddText}>Set date</Text>
                </TouchableOpacity>
              )}

              {/* Inline calendar */}
              {showDatePicker && !dueDate && (
                <Animated.View entering={FadeIn.duration(motion.fast)} style={styles.datePickerContainer}>
                  <DatePicker value={dueDate} onChange={(d) => { if (d) { setDueDate(d); setShowDatePicker(false); } }} />
                </Animated.View>
              )}

              {/* Time selector — only if date chosen */}
              {dueDate && (
                <Animated.View entering={FadeIn.duration(motion.fast)}>
                  <View style={styles.timeHeader}>
                    <Text style={styles.subLabel}>Time</Text>
                    {selectedTime && (
                      <TouchableOpacity onPress={() => setSelectedTime(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.clearTime}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScrollContent}>
                    {TIME_OPTIONS.map((t) => {
                      const active = selectedTime === t;
                      return (
                        <TouchableOpacity key={t} style={[styles.timeChip, active && styles.timeChipActive]} onPress={() => setSelectedTime(active ? null : t)} activeOpacity={0.7}>
                          <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{t}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* ── Recurrence ───────────────────── */}
          <Text style={[styles.label, { marginTop: spacing.xl }]}>Repeat</Text>
          <RecurrencePicker value={recurrence} onChange={setRecurrence} />

          {/* Save button */}
          <TouchableOpacity style={[styles.saveButton, !canSave && styles.saveButtonDisabled]} onPress={handleSave} disabled={!canSave} activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save Task"}</Text>
          </TouchableOpacity>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface,
    zIndex: 200,
  },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    ...elevation.level1,
  },
  headerBtn: { padding: spacing.sm, minWidth: 56, alignItems: "center" },
  headerTitle: { ...typography.titleMedium },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: colors.primary },
  saveBtnDisabled: { color: colors.outlineVariant },

  // Body
  body: { padding: spacing.xl },
  titleInput: {
    ...typography.titleLarge,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  descInput: {
    ...typography.bodyLarge,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 100,
    marginBottom: spacing.xxl,
    borderWidth: 0,
  },
  label: {
    ...typography.labelLarge,
    marginBottom: spacing.sm,
  },
  subLabel: {
    ...typography.bodyMedium,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },

  // Date row
  dateSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  dateSelectedText: {
    ...typography.bodyLarge,
    flex: 1,
    color: colors.primary,
    fontWeight: "600",
  },
  dateAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  dateAddText: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: "600",
  },
  datePickerContainer: {
    marginBottom: spacing.md,
  },

  // Time
  timeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  clearTime: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
  },
  timeScrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  timeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
  },
  timeChipText: {
    ...typography.bodyMedium,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  timeChipTextActive: {
    color: colors.onPrimary,
  },

  // Save
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xxl,
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  saveButtonText: {
    ...typography.titleSmall,
    color: colors.onPrimary,
  },
});
