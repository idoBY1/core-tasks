// ─────────────────────────────────────────────
// Smart Todo — Search Result Item
// Individual result row with relevance badge
// ─────────────────────────────────────────────

import React from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { Item, Task, Note } from "../../types/item";
import { isTask, isNote } from "../../types/item";
import type { SearchResult } from "../../services/semanticSearch";
import { ImportanceBadge } from "../shared/ImportanceBadge";
import { displayDate, isOverdue } from "../../utils/dateUtils";
import { colors, typography, spacing, radius } from "../../theme";

interface Props {
  result: SearchResult;
  onPress: (item: Item) => void;
}

// ── Score badge ────────────────────────────

function ScoreBadge({ score, method }: { score: number; method: string }) {
  const percent = Math.round(score * 100);
  const bgColor =
    percent >= 70
      ? colors.successContainer
      : percent >= 40
      ? colors.warningContainer
      : colors.surfaceContainer;
  const fgColor =
    percent >= 70
      ? colors.success
      : percent >= 40
      ? colors.warning
      : colors.onSurfaceMuted;

  return (
    <View style={[styles.scoreBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.scoreText, { color: fgColor }]}>{percent}%</Text>
      {method !== "keyword" && (
        <MaterialIcons name="psychology" size={10} color={fgColor} />
      )}
    </View>
  );
}

// ── Component ──────────────────────────────

export function SearchResultItem({ result, onPress }: Props) {
  const { item, score, method } = result;
  const task = isTask(item) ? (item as Task) : null;
  const note = isNote(item) ? (item as Note) : null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {/* Left: type icon */}
      <View style={styles.typeIcon}>
        <MaterialIcons
          name={task ? "assignment" : "description"}
          size={20}
          color={task ? colors.primary : colors.noteAccent}
        />
      </View>

      {/* Center: title + meta */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {task && <ImportanceBadge priority={task.userPriority} />}
          {task?.dueDate && (
            <View style={styles.metaItem}>
              <MaterialIcons
                name="event"
                size={12}
                color={isOverdue(task.dueDate) ? colors.error : colors.onSurfaceMuted}
              />
              <Text
                style={[
                  styles.metaText,
                  isOverdue(task.dueDate) && { color: colors.error },
                ]}
              >
                {displayDate(task.dueDate)}
              </Text>
            </View>
          )}
          {note?.pinned && (
            <View style={styles.metaItem}>
              <MaterialIcons name="push-pin" size={12} color={colors.noteAccent} />
              <Text style={styles.metaText}>Pinned</Text>
            </View>
          )}
          {item.tags.length > 0 && (
            <Text style={styles.tagText} numberOfLines={1}>
              {item.tags.slice(0, 3).join(", ")}
            </Text>
          )}
        </View>
        {/* Content preview */}
        {item.content ? (
          <Text style={styles.preview} numberOfLines={1}>
            {item.content}
          </Text>
        ) : null}
      </View>

      {/* Right: score badge */}
      <ScoreBadge score={score} method={method} />
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.titleSmall,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  metaText: {
    ...typography.labelMedium,
  },
  tagText: {
    ...typography.labelMedium,
    color: colors.noteAccent,
    fontStyle: "italic",
  },
  preview: {
    ...typography.bodyMedium,
    color: colors.onSurfaceMuted,
  },
  scoreBadge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    minWidth: 44,
    gap: 1,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
