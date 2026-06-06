// ─────────────────────────────────────────────
// Smart Todo — Item Card (swipeable, Material 3)
// ─────────────────────────────────────────────

import React, { useRef, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { MaterialIcons } from "@expo/vector-icons";
import type { Item, Task, Note } from "../../types/item";
import { isTask, isNote } from "../../types/item";
import { ImportanceBadge } from "./ImportanceBadge";
import { displayDate, isOverdue, displayTime } from "../../utils/dateUtils";
import { colors, typography, spacing, radius, elevation } from "../../theme";

interface Props {
  item: Item;
  onPress: (item: Item) => void;
  onComplete?: (id: string) => void;
  onArchive?: (id: string) => void;
  compact?: boolean;
}

export function ItemCard({ item, onPress, onComplete, onArchive, compact }: Props) {
  const swipeRef = useRef<Swipeable>(null);
  const [checkPressed, setCheckPressed] = useState(false);
  const task = isTask(item) ? (item as Task) : null;
  const note = isNote(item) ? (item as Note) : null;

  // ── Swipe actions ─────────────────────────

  const renderRightActions = (
    _progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>
  ) => {
    if (!task || task.status === "done") return null;
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });
    return (
      <RNAnimated.View style={[styles.swipeAction, styles.swipeLeft, { transform: [{ scale }] }]}>
        <MaterialIcons name="archive" size={18} color={colors.onSurface} />
        <Text style={styles.swipeText}>Archive</Text>
      </RNAnimated.View>
    );
  };

  const renderLeftActions = (
    _progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>
  ) => {
    if (!task || task.status === "done") return null;
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.5, 1],
      extrapolate: "clamp",
    });
    return (
      <RNAnimated.View style={[styles.swipeAction, styles.swipeRight, { transform: [{ scale }] }]}>
        <MaterialIcons name="check" size={18} color={colors.onSurface} />
        <Text style={styles.swipeText}>Done</Text>
      </RNAnimated.View>
    );
  };

  const handleSwipeRight = () => {
    if (task && onComplete) onComplete(task.id);
    swipeRef.current?.close();
  };

  const handleSwipeLeft = () => {
    if (onArchive) onArchive(item.id);
    swipeRef.current?.close();
  };

  // ── Render ─────────────────────────────────

  const card = (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      <View style={styles.inner}>
        {/* Top row: title left, badge right */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
            {item.title}
          </Text>
          {task && <ImportanceBadge priority={task.userPriority} />}
        </View>

        {/* Meta row for tasks */}
        {task && !compact && (
          <View style={styles.metaRow}>
            {task.dueDate && (
              <View style={styles.metaItem}>
                <MaterialIcons
                  name="event"
                  size={13}
                  color={isOverdue(task.dueDate) ? colors.error : colors.onSurfaceMuted}
                />
                <Text style={[styles.meta, isOverdue(task.dueDate) && styles.metaOverdue]}>
                  {displayDate(task.dueDate)}
                  {!task.isAllDay && displayTime(task.dueDate) ? ` \u00B7 ${displayTime(task.dueDate)}` : ""}
                </Text>
              </View>
            )}
            {task.status === "done" && (
              <View style={styles.metaItem}>
                <MaterialIcons name="check-circle" size={13} color={colors.success} />
                <Text style={[styles.meta, { color: colors.success }]}>Done</Text>
              </View>
            )}
            {task.status === "in_progress" && (
              <View style={styles.metaItem}>
                <MaterialIcons name="schedule" size={13} color={colors.primary} />
                <Text style={[styles.meta, { color: colors.primary }]}>In Progress</Text>
              </View>
            )}
          </View>
        )}

        {/* Subtask progress */}
        {task && task.completedSubtasks > 0 && !compact && (
          <Text style={styles.subtaskProgress}>
            {task.completedSubtasks} subtask{task.completedSubtasks !== 1 ? "s" : ""} done
          </Text>
        )}

        {/* Note content preview */}
        {note && item.content && !compact && (
          <Text style={styles.notePreview} numberOfLines={2}>
            {item.content}
          </Text>
        )}

        {/* Note indicators */}
        {note && !compact && (
          <View style={styles.metaRow}>
            {note.pinned && (
              <View style={styles.metaItem}>
                <MaterialIcons name="push-pin" size={13} color={colors.onSurfaceMuted} />
                <Text style={styles.meta}>Pinned</Text>
              </View>
            )}
            {note.checklist && (
              <View style={styles.metaItem}>
                <MaterialIcons name="check-box" size={13} color={colors.noteAccent} />
                <Text style={styles.meta}>
                  {note.checklist.filter((c) => c.checked).length}/{note.checklist.length}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Quick complete button for tasks */}
      {task && task.status !== "done" && onComplete && (
        <TouchableOpacity
          style={styles.checkBtn}
          onPress={() => onComplete(task.id)}
          onPressIn={() => setCheckPressed(true)}
          onPressOut={() => setCheckPressed(false)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[styles.checkCircle, checkPressed && styles.checkCirclePressed]}>
            <MaterialIcons
              name="check"
              size={16}
              color={checkPressed ? colors.surface : colors.outlineVariant}
            />
          </View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Wrap in Swipeable if actions available
  const canSwipe = (task && task.status !== "done") || onArchive;

  if (!canSwipe) return card;

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableRightOpen={handleSwipeLeft}
      onSwipeableLeftOpen={handleSwipeRight}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      {card}
    </Swipeable>
  );
}

// ── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...elevation.level1,
  },
  inner: {
    flex: 1,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    ...typography.titleSmall,
    flex: 1,
  },
  titleCompact: { fontSize: 14 },
  metaRow: {
    flexDirection: "row",
    marginTop: spacing.xs + 2,
    gap: spacing.md - 2,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  meta: {
    ...typography.labelMedium,
  },
  metaOverdue: { color: colors.error },
  subtaskProgress: {
    ...typography.labelMedium,
    color: colors.noteAccent,
    marginTop: spacing.xs,
  },
  notePreview: {
    ...typography.bodyMedium,
    marginTop: spacing.xs,
  },
  checkBtn: { padding: spacing.lg },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkCirclePressed: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    gap: 2,
  },
  swipeRight: { backgroundColor: colors.successContainer, alignItems: "flex-start" },
  swipeLeft: { backgroundColor: colors.warningContainer, alignItems: "flex-end" },
  swipeText: {
    ...typography.labelMedium,
    color: colors.onSurface,
  },
});
