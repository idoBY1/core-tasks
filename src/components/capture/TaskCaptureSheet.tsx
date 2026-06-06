// ─────────────────────────────────────────────
// Smart Todo — Task Capture Sheet
// ─────────────────────────────────────────────

import React, { useState, useCallback, forwardRef, useMemo } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { Priority } from "../../types/item";
import type { RecurrenceFrequency } from "../../types/recurrence";
import { ImportanceSelector } from "./ImportanceSelector";
import { DatePicker } from "./DatePicker";
import { useItemsStore } from "../../store/itemsStore";
import * as Haptics from "expo-haptics";

interface Props {
  onSaved?: () => void;
}

export const TaskCaptureSheet = forwardRef<BottomSheetModal, Props>(
  ({ onSaved }, ref) => {
    const addTask = useItemsStore((s) => s.addTask);
    const updateTask = useItemsStore((s) => s.updateTask);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<Priority>("medium");
    const [hasDate, setHasDate] = useState(false);
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [isAllDay, setIsAllDay] = useState(true);
    const [recurrence, setRecurrence] = useState<RecurrenceFrequency | "none">("none");

    const snapPoints = useMemo(() => ["85%"], []);

    const reset = useCallback(() => {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setHasDate(false);
      setDueDate(null);
      setIsAllDay(true);
      setRecurrence("none");
    }, []);

    const handleSave = useCallback(async () => {
      if (!title.trim()) return;

      const task = await addTask(title.trim(), priority);

      // Apply optional fields
      const updates: Record<string, any> = {};
      if (description.trim()) updates.content = description.trim();
      if (hasDate && dueDate) {
        updates.dueDate = dueDate.toISOString();
        updates.isAllDay = isAllDay;
      }
      if (recurrence !== "none") {
        updates.recurrence = { frequency: recurrence, interval: 1 };
      }

      if (Object.keys(updates).length > 0) {
        await updateTask(task.id, updates);
      }

      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      reset();
      if (ref && typeof ref === "object" && ref.current) {
        ref.current.dismiss();
      }
      onSaved?.();
    }, [title, description, priority, hasDate, dueDate, isAllDay, recurrence, addTask, updateTask, reset, onSaved, ref]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.indicator}
        backgroundStyle={styles.sheetBg}
        onDismiss={reset}
        enableDynamicSizing={false}
      >
        <BottomSheetScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sheetTitle}>New Task</Text>

          {/* Title */}
          <TextInput
            style={styles.titleInput}
            placeholder="What needs to be done?"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />

          {/* Description */}
          <TextInput
            style={styles.descInput}
            placeholder="Add details (optional)"
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Importance */}
          <Text style={styles.fieldLabel}>Importance</Text>
          <ImportanceSelector value={priority} onChange={setPriority} />

          {/* Due date toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.fieldLabel}>Due Date</Text>
            <Switch
              value={hasDate}
              onValueChange={setHasDate}
              trackColor={{ true: "#3b82f6", false: "#e2e8f0" }}
            />
          </View>

          {hasDate && (
            <View style={styles.dateSection}>
              <DatePicker
                value={dueDate}
                onChange={(d) => setDueDate(d === null ? null : d)}
              />

              {/* All day toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.fieldLabel}>All Day</Text>
                <Switch
                  value={isAllDay}
                  onValueChange={setIsAllDay}
                  trackColor={{ true: "#3b82f6", false: "#e2e8f0" }}
                />
              </View>
            </View>
          )}

          {/* Recurrence */}
          <Text style={styles.fieldLabel}>Repeat</Text>
          <View style={styles.recurrenceRow}>
            {(["none", "daily", "weekly", "monthly"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.recurrenceBtn,
                  recurrence === opt && styles.recurrenceActive,
                ]}
                onPress={() => setRecurrence(opt)}
              >
                <Text
                  style={[
                    styles.recurrenceLabel,
                    recurrence === opt && styles.recurrenceLabelActive,
                  ]}
                >
                  {opt === "none" ? "None" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!title.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>Create Task</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

TaskCaptureSheet.displayName = "TaskCaptureSheet";

// ── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  indicator: { backgroundColor: "#cbd5e1" },
  sheetBg: { backgroundColor: "#fff" },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 20,
  },
  titleInput: {
    fontSize: 17,
    fontWeight: "500",
    color: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 12,
    marginBottom: 12,
  },
  descInput: {
    fontSize: 15,
    color: "#475569",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 4,
  },
  dateSection: {
    marginBottom: 8,
  },
  recurrenceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  recurrenceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  recurrenceActive: { backgroundColor: "#3b82f6" },
  recurrenceLabel: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  recurrenceLabelActive: { color: "#fff" },
  saveBtn: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
