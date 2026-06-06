// ─────────────────────────────────────────────
// Smart Todo — Note Capture Screen
// Seamless checklist — tap "Add checklist item" to start a list.
// Once a list is started, content input is compact. No switches.
// After creation, checklist mode is immutable.
// ─────────────────────────────────────────────

import React, { useState, useCallback, useRef } from "react";
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
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { useItemsStore } from "../../store/itemsStore";
import { colors, typography, spacing, radius, elevation, motion } from "../../theme";
import * as Haptics from "expo-haptics";

interface ChecklistRow {
  id: string;
  text: string;
  checked: boolean;
}

interface Props {
  onClose: () => void;
}

const NOTE_COLORS = [
  "#FFFFFF", "#FEF3C7", "#DBEAFE", "#D1FAE5",
  "#FEE2E2", "#EDE9FE", "#FCE7F3", "#F0F9FF",
];

let _rowId = 0;
function nextRowId() {
  return `cl-${Date.now()}-${++_rowId}`;
}

export function NoteCaptureScreen({ onClose }: Props) {
  const addNote = useItemsStore((s) => s.addNote);
  const updateNote = useItemsStore((s) => s.updateNote);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#FFFFFF");
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [saving, setSaving] = useState(false);

  const newItemIdRef = useRef<string | null>(null);

  // ── Checklist helpers ────────────────────

  const addChecklistItem = useCallback(() => {
    const id = nextRowId();
    newItemIdRef.current = id;
    setChecklist((prev) => [...prev, { id, text: "", checked: false }]);
  }, []);

  const toggleCheck = useCallback((id: string) => {
    setChecklist((prev) =>
      prev.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r))
    );
  }, []);

  const updateCheckText = useCallback((id: string, text: string) => {
    setChecklist((prev) =>
      prev.map((r) => (r.id === id ? { ...r, text } : r))
    );
  }, []);

  const removeCheck = useCallback((id: string) => {
    setChecklist((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ── Save ─────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!title.trim() || saving) return;
    setSaving(true);

    try {
      const note = await addNote(title.trim());

      const updates: Record<string, any> = {};
      if (content.trim()) updates.content = content.trim();
      if (color !== "#FFFFFF") updates.color = color;

      const filledItems = checklist.filter((r) => r.text.trim().length > 0);
      if (filledItems.length > 0) {
        updates.checklist = filledItems.map((r) => ({
          id: r.id,
          text: r.text.trim(),
          checked: r.checked,
        }));
      }

      if (Object.keys(updates).length > 0) {
        await updateNote(note.id, updates);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      console.error("[NoteCaptureScreen] save failed:", e);
      setSaving(false);
    }
  }, [title, content, color, checklist, saving, addNote, updateNote, onClose]);

  const hasChecklist = checklist.length > 0;
  const canSave = !!title.trim() && !saving;

  return (
    <Animated.View style={styles.screen} entering={SlideInDown.duration(motion.normal)}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Note</Text>
          <TouchableOpacity onPress={handleSave} disabled={!canSave} style={styles.headerBtn}>
            <Text style={[styles.saveBtnText, !canSave && styles.saveBtnDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <TextInput
            style={styles.titleInput}
            placeholder="Note title"
            placeholderTextColor={colors.onSurfaceMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />

          {/* Content — full when no checklist, compact when checklist */}
          {!hasChecklist ? (
            <TextInput
              style={styles.contentInput}
              placeholder="Write something…"
              placeholderTextColor={colors.onSurfaceMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          ) : (
            <TextInput
              style={styles.contentInputCompact}
              placeholder="Add a note above the list…"
              placeholderTextColor={colors.onSurfaceMuted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          )}

          {/* ── Checklist ────────────────────── */}
          {checklist.map((row) => (
            <Animated.View key={row.id} style={styles.checkRow} entering={FadeIn.duration(motion.fast)}>
              <TouchableOpacity onPress={() => toggleCheck(row.id)} style={styles.checkbox} activeOpacity={0.6}>
                <MaterialIcons
                  name={row.checked ? "check-box" : "check-box-outline-blank"}
                  size={22}
                  color={colors.noteAccent}
                />
              </TouchableOpacity>
              <TextInput
                style={[styles.checkInput, row.checked && styles.checkInputDone]}
                value={row.text}
                onChangeText={(t) => updateCheckText(row.id, t)}
                placeholder="List item…"
                placeholderTextColor={colors.onSurfaceMuted}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={addChecklistItem}
                autoFocus={newItemIdRef.current === row.id}
              />
              <TouchableOpacity onPress={() => removeCheck(row.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={20} color={colors.outlineVariant} />
              </TouchableOpacity>
            </Animated.View>
          ))}

          {/* Add checklist item — always available */}
          <TouchableOpacity style={styles.addCheckRow} onPress={addChecklistItem} activeOpacity={0.6}>
            <MaterialIcons name="check-box-outline-blank" size={18} color={hasChecklist ? colors.noteAccent : colors.onSurfaceMuted} />
            <Text style={[styles.addCheckLabel, hasChecklist && { color: colors.noteAccent }]}>
              {hasChecklist ? "Add item" : "Add checklist item"}
            </Text>
          </TouchableOpacity>

          {/* Color picker */}
          <Text style={styles.sectionLabel}>Color</Text>
          <View style={styles.colorRow}>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* Save button */}
          <TouchableOpacity style={[styles.saveButton, !canSave && styles.saveButtonDisabled]} onPress={handleSave} disabled={!canSave} activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save Note"}</Text>
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
  saveBtnText: { fontSize: 16, fontWeight: "700", color: colors.noteAccent },
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
  contentInput: {
    ...typography.bodyLarge,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 120,
    marginBottom: spacing.lg,
    borderWidth: 0,
  },
  contentInputCompact: {
    ...typography.bodyLarge,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 60,
    marginBottom: spacing.md,
    borderWidth: 0,
  },

  // Checklist
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkbox: { padding: spacing.xs },
  checkInput: {
    flex: 1,
    ...typography.bodyLarge,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 0,
  },
  checkInputDone: {
    textDecorationLine: "line-through",
    color: colors.onSurfaceMuted,
  },
  addCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  addCheckLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.onSurfaceMuted,
  },

  // Color picker
  sectionLabel: {
    ...typography.labelLarge,
    marginBottom: spacing.md,
  },
  colorRow: {
    flexDirection: "row",
    gap: 2,
    flexWrap: "wrap",
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: colors.noteAccent,
  },

  // Save
  saveButton: {
    backgroundColor: colors.noteAccent,
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
