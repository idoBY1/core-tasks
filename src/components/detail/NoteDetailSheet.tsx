// ─────────────────────────────────────────────
// Smart Todo — Note Detail Sheet
// Checklist mode is immutable after creation.
// Pin is a toggle button, not a switch.
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
import Animated, { FadeIn } from "react-native-reanimated";
import { LinkedItemsList } from "../shared/LinkedItemsList";
import { LinkSuggestionCard } from "../shared/LinkSuggestionCard";
import type { Note, ChecklistItem, Item } from "../../types/item";
import { useItemsStore } from "../../store/itemsStore";
import { relativeTime } from "../../utils/dateUtils";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, typography, spacing, radius, elevation, motion } from "../../theme";

interface Props {
  note: Note | null;
  onDismiss?: () => void;
  onItemPress?: (item: Item) => void;
}

const NOTE_COLORS = [
  "#FFFFFF", "#FEF3C7", "#DBEAFE", "#D1FAE5",
  "#FEE2E2", "#EDE9FE", "#FCE7F3", "#F0F9FF",
];

export const NoteDetailSheet = forwardRef<BottomSheetModal, Props>(
  ({ note, onDismiss, onItemPress }, ref) => {
    const updateNote = useItemsStore((s) => s.updateNote);
    const deleteItem = useItemsStore((s) => s.deleteItem);
    const suggestions = useItemsStore((s) => s.linking.suggestions);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [color, setColor] = useState("#FFFFFF");
    const [pinned, setPinned] = useState(false);
    const [checklist, setChecklist] = useState<ChecklistItem[] | null>(null);

    const snapPoints = useMemo(() => ["90%"], []);

    // Filter suggestions for this note
    const noteSuggestions = suggestions.filter(
      (sg) => sg.fromItem.id === note?.id || sg.toItem.id === note?.id
    );

    // Sync from note
    useEffect(() => {
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setColor(note.color);
        setPinned(note.pinned);
        setChecklist(note.checklist);
      }
    }, [note]);

    const save = useCallback(async () => {
      if (!note || !title.trim()) return;
      await updateNote(note.id, {
        title: title.trim(),
        content: content.trim(),
        color,
        pinned,
        checklist,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [note, title, content, color, pinned, checklist, updateNote]);

    const handleDismiss = useCallback(() => {
      save();
      onDismiss?.();
    }, [save, onDismiss]);

    const handleDelete = useCallback(() => {
      if (!note) return;
      Alert.alert("Delete Note?", `Delete "${note.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteItem(note.id);
            if (ref && typeof ref === "object" && ref.current) ref.current.dismiss();
          },
        },
      ]);
    }, [note, deleteItem, ref]);

    // Checklist interactions
    const toggleCheckItem = useCallback((id: string) => {
      setChecklist((prev) =>
        prev ? prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c)) : prev
      );
    }, []);

    const addCheckItem = useCallback(() => {
      setChecklist((prev) => {
        const list = prev ?? [];
        return [...list, { id: `cli-${Date.now()}`, text: "", checked: false }];
      });
    }, []);

    const updateCheckItemText = useCallback((id: string, text: string) => {
      setChecklist((prev) =>
        prev ? prev.map((c) => (c.id === id ? { ...c, text } : c)) : prev
      );
    }, []);

    const removeCheckItem = useCallback((id: string) => {
      setChecklist((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    }, []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      []
    );

    if (!note) return null;

    const isChecklist = !!checklist;

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
            <Text style={typography.labelMedium}>Created {relativeTime(note.createdAt)}</Text>
            {isChecklist && (
              <View style={styles.checklistBadge}>
                <MaterialIcons name="checklist" size={14} color={colors.noteAccent} />
                <Text style={styles.checklistBadgeText}>Checklist</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Note title"
            placeholderTextColor={colors.onSurfaceMuted}
            multiline
          />

          {/* Content or Checklist (immutable mode) */}
          {isChecklist ? (
            <View style={styles.checklistContainer}>
              {checklist.map((item) => (
                <Animated.View key={item.id} style={styles.checkItem} entering={FadeIn.duration(motion.fast)}>
                  <TouchableOpacity onPress={() => toggleCheckItem(item.id)} activeOpacity={0.6}>
                    <MaterialIcons
                      name={item.checked ? "check-box" : "check-box-outline-blank"}
                      size={22}
                      color={colors.noteAccent}
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.checkInput, item.checked && styles.checkInputDone]}
                    value={item.text}
                    onChangeText={(t) => updateCheckItemText(item.id, t)}
                    placeholder="Item…"
                    placeholderTextColor={colors.onSurfaceMuted}
                  />
                  <TouchableOpacity onPress={() => removeCheckItem(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={20} color={colors.error} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
              <TouchableOpacity style={styles.addCheckBtn} onPress={addCheckItem} activeOpacity={0.6}>
                <View style={styles.iconLabelRow}>
                  <MaterialIcons name="add" size={16} color={colors.noteAccent} />
                  <Text style={styles.addCheckLabel}>Add item</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              style={[styles.contentInput, { backgroundColor: color + "40" }]}
              value={content}
              onChangeText={setContent}
              placeholder="Write something…"
              placeholderTextColor={colors.onSurfaceMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          )}

          {/* Pin toggle — button, not switch */}
          <TouchableOpacity
            style={[styles.pinButton, pinned && styles.pinButtonActive]}
            onPress={() => setPinned(!pinned)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="push-pin"
              size={16}
              color={pinned ? colors.onPrimary : colors.onSurfaceVariant}
            />
            <Text style={[styles.pinLabel, pinned && styles.pinLabelActive]}>
              {pinned ? "Pinned" : "Pin"}
            </Text>
          </TouchableOpacity>

          {/* Color picker */}
          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorRow}>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* ── Linked Items ──────────────────── */}
          {note && (
            <>
              <Text style={styles.fieldLabel}>Links</Text>
              <LinkedItemsList itemId={note.id} onItemPress={(item) => onItemPress?.(item)} />
            </>
          )}

          {/* ── Link Suggestions ──────────────── */}
          {noteSuggestions.length > 0 && (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {noteSuggestions.slice(0, 3).map((sg) => (
                <LinkSuggestionCard
                  key={`${sg.fromItem.id}-${sg.toItem.id}`}
                  fromItem={sg.fromItem.id === note?.id ? sg.fromItem : sg.toItem}
                  toItem={sg.fromItem.id === note?.id ? sg.toItem : sg.fromItem}
                  similarity={sg.similarity}
                />
              ))}
            </View>
          )}

          {/* Delete */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <View style={styles.iconLabelRow}>
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

NoteDetailSheet.displayName = "NoteDetailSheet";

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
  checklistBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.noteAccentContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  checklistBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.noteAccent,
  },
  titleInput: {
    ...typography.titleLarge,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  contentInput: {
    ...typography.bodyLarge,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 120,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    ...typography.labelLarge,
    marginBottom: spacing.sm,
  },

  // Pin button
  pinButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignSelf: "flex-start",
    marginBottom: spacing.xl,
  },
  pinButtonActive: {
    backgroundColor: colors.noteAccent,
  },
  pinLabel: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
  },
  pinLabelActive: {
    color: colors.onPrimary,
  },

  // Checklist
  checklistContainer: { marginBottom: spacing.lg },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkInput: {
    flex: 1,
    ...typography.bodyLarge,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkInputDone: {
    textDecorationLine: "line-through",
    color: colors.onSurfaceMuted,
  },
  addCheckBtn: { paddingVertical: spacing.sm },
  addCheckLabel: {
    fontSize: 14,
    color: colors.noteAccent,
    fontWeight: "600",
  },
  iconLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Color
  colorRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: "wrap",
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: colors.noteAccent,
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
