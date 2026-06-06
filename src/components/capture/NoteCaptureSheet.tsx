// ─────────────────────────────────────────────
// Smart Todo — Note Capture Sheet
// ─────────────────────────────────────────────

import React, { useState, useCallback, forwardRef, useMemo } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useItemsStore } from "../../store/itemsStore";
import * as Haptics from "expo-haptics";

interface Props {
  onSaved?: () => void;
}

const NOTE_COLORS = [
  "#FFFFFF", "#FEF3C7", "#DBEAFE", "#D1FAE5",
  "#FEE2E2", "#EDE9FE", "#FCE7F3", "#F0F9FF",
];

export const NoteCaptureSheet = forwardRef<BottomSheetModal, Props>(
  ({ onSaved }, ref) => {
    const addNote = useItemsStore((s) => s.addNote);
    const updateNote = useItemsStore((s) => s.updateNote);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [color, setColor] = useState("#FFFFFF");
    const [isChecklist, setIsChecklist] = useState(false);

    const snapPoints = useMemo(() => ["75%"], []);

    const reset = useCallback(() => {
      setTitle("");
      setContent("");
      setColor("#FFFFFF");
      setIsChecklist(false);
    }, []);

    const handleSave = useCallback(async () => {
      if (!title.trim()) return;

      const note = await addNote(title.trim());

      const updates: Record<string, any> = {};
      if (content.trim()) updates.content = content.trim();
      if (color !== "#FFFFFF") updates.color = color;
      if (isChecklist) {
        updates.checklist = content
          .split("\n")
          .filter((l) => l.trim())
          .map((text, i) => ({
            id: `cli-${i}`,
            text: text.trim(),
            checked: false,
          }));
        updates.content = "";
      }

      if (Object.keys(updates).length > 0) {
        await updateNote(note.id, updates);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      reset();
      if (ref && typeof ref === "object" && ref.current) {
        ref.current.dismiss();
      }
      onSaved?.();
    }, [title, content, color, isChecklist, addNote, updateNote, reset, onSaved, ref]);

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
          <Text style={styles.sheetTitle}>New Note</Text>

          {/* Title */}
          <TextInput
            style={styles.titleInput}
            placeholder="Note title"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />

          {/* Content */}
          <TextInput
            style={[styles.contentInput, { backgroundColor: color + "40" }]}
            placeholder={isChecklist ? "One item per line…" : "Write something…"}
            placeholderTextColor="#94a3b8"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          {/* Checklist toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.fieldLabel}>Checklist Mode</Text>
            <Switch
              value={isChecklist}
              onValueChange={setIsChecklist}
              trackColor={{ true: "#6366f1", false: "#e2e8f0" }}
            />
          </View>

          {/* Color picker */}
          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorRow}>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && styles.colorSelected,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!title.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>Create Note</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

NoteCaptureSheet.displayName = "NoteCaptureSheet";

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
  contentInput: {
    fontSize: 15,
    color: "#475569",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#6366f1",
  },
  saveBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
