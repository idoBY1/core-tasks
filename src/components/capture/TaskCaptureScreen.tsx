// ─────────────────────────────────────────────
// Smart Todo — Task Capture Screen
// No switches — tap date row to add, x to clear.
// Due date only for non-recurring tasks.
// Recurrence: daily=no date, weekly=day chips,
// monthly=multi-day grid, none=free date.
// Time picker: any minute of the day.
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
import type { Priority } from "../../types/item";
import { ImportanceSelector } from "./ImportanceSelector";
import { DatePickerModal, DateChip } from "./DatePicker";
import { TimePickerModal, TimeChip } from "./TimePicker";
import { RecurrencePicker, type RecurrenceValue } from "./RecurrencePicker";
import { useItemsStore } from "../../store/itemsStore";
import { colors, typography, spacing, radius, elevation, motion } from "../../theme";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface Props {
  onClose: () => void;
}

export function TaskCaptureScreen({ onClose }: Props) {
  const addTask = useItemsStore((s) => s.addTask);
  const updateTask = useItemsStore((s) => s.updateTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
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
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!title.trim() || saving) return;
    setSaving(true);

    try {
      const task = await addTask(title.trim(), priority);
      const updates: Record<string, any> = {};
      if (description.trim()) updates.content = description.trim();

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
      }

      // Recurrence
      if (recurrence.frequency !== "none") {
        updates.recurrence = {
          frequency: recurrence.frequency,
          interval: 1,
          daysOfWeek: recurrence.daysOfWeek.length > 0 ? recurrence.daysOfWeek : null,
          daysOfMonth: recurrence.daysOfMonth.length > 0 ? recurrence.daysOfMonth : null,
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
  }, [title, description, priority, dueDate, selectedTime, hasTime, recurrence, saving, addTask, updateTask, onClose]);

  const canSave = !!title.trim() && !saving;
  const showDateSection = recurrence.frequency === "none";

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

          {/* ── Due Date (only when no recurrence) ── */}
          {showDateSection && (
            <Animated.View entering={FadeIn.duration(motion.fast)} exiting={FadeOut.duration(motion.fast)}>
              <Text style={[styles.label, { marginTop: spacing.xl }]}>Due Date</Text>
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
