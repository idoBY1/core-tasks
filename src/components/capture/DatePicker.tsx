// ─────────────────────────────────────────────
// Smart Todo — Date Picker
// Modal overlay with calendar grid.
// After picking, shows a compact chip with
// edit and clear options.
// ─────────────────────────────────────────────

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday as checkIsToday,
} from "date-fns";
import { colors, typography, spacing, radius } from "../../theme";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

// ── Public interface ──────────────────────

interface DatePickerModalProps {
  visible: boolean;
  value: Date | null;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

interface DateChipProps {
  date: Date;
  onPress: () => void;
  onClear: () => void;
}

// ── Constants ─────────────────────────────

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const CELL_SIZE = 40;

// ── Modal Date Picker ────────────────────

export function DatePickerModal({ visible, value, onConfirm, onCancel }: DatePickerModalProps) {
  const [viewMonth, setViewMonth] = useState(value ?? new Date());
  const [selected, setSelected] = useState<Date | null>(value);

  // Sync when modal opens
  useEffect(() => {
    if (visible) {
      setSelected(value);
      setViewMonth(value ?? new Date());
    }
  }, [visible, value]);

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const rows: Date[][] = [];
    let cursor = calStart;
    while (cursor <= calEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(cursor);
        cursor = addDays(cursor, 1);
      }
      rows.push(week);
    }
    return rows;
  }, [viewMonth]);

  const handleSelectDay = useCallback((day: Date) => {
    setSelected(day);
    Haptics.selectionAsync();
  }, []);

  const handleConfirm = useCallback(() => {
    if (selected) {
      Haptics.selectionAsync();
      onConfirm(selected);
    }
  }, [selected, onConfirm]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayDismiss} activeOpacity={1} onPress={onCancel} />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onCancel} style={styles.modalHeaderBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Pick Date</Text>
            <TouchableOpacity
              onPress={handleConfirm}
              style={styles.modalHeaderBtn}
              disabled={!selected}
            >
              <Text style={[styles.modalDoneText, !selected && styles.modalDoneDisabled]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Selected preview */}
          {selected && (
            <View style={styles.previewRow}>
              <MaterialIcons name="event" size={20} color={colors.primary} />
              <Text style={styles.previewText}>{format(selected, "EEE, MMM d, yyyy")}</Text>
            </View>
          )}

          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setViewMonth((m) => subMonths(m, 1))}
              activeOpacity={0.6}
            >
              <MaterialIcons name="chevron-left" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{format(viewMonth, "MMMM yyyy")}</Text>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setViewMonth((m) => addMonths(m, 1))}
              activeOpacity={0.6}
            >
              <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.dayRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={styles.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                const inMonth = isSameMonth(day, viewMonth);
                const isSelected = selected ? isSameDay(day, selected) : false;
                const today = checkIsToday(day);

                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      styles.dayCell,
                      isSelected && styles.daySelected,
                      today && !isSelected && styles.dayToday,
                    ]}
                    onPress={() => handleSelectDay(day)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !inMonth && styles.dayOutside,
                        isSelected && styles.dayTextSelected,
                        today && !isSelected && styles.dayTextToday,
                      ]}
                    >
                      {format(day, "d")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Quick picks */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => { setSelected(new Date()); Haptics.selectionAsync(); }}
              activeOpacity={0.6}
            >
              <Text style={styles.quickLabel}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => { setSelected(addDays(new Date(), 1)); Haptics.selectionAsync(); }}
              activeOpacity={0.6}
            >
              <Text style={styles.quickLabel}>Tomorrow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Compact Date Chip ─────────────────────

export function DateChip({ date, onPress, onClear }: DateChipProps) {
  return (
    <View style={styles.chip}>
      <TouchableOpacity style={styles.chipContent} onPress={onPress} activeOpacity={0.7}>
        <MaterialIcons name="event" size={16} color={colors.primary} />
        <Text style={styles.chipText}>{format(date, "EEE, MMM d")}</Text>
        <MaterialIcons name="edit" size={14} color={colors.onSurfaceVariant} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.chipClear}
        onPress={onClear}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
      >
        <MaterialIcons name="close" size={16} color={colors.onSurfaceMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────

const styles = StyleSheet.create({
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  overlayDismiss: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    elevation: 6,
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: spacing.md,
  },
  modalHeaderBtn: { padding: spacing.sm },
  modalTitle: { ...typography.titleMedium },
  modalCancelText: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  modalDoneText: { ...typography.bodyLarge, color: colors.primary, fontWeight: "700" },
  modalDoneDisabled: { color: colors.outlineVariant },

  // Preview
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  previewText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },

  // Month nav
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: spacing.lg,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },

  // Day headers
  dayRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  dayLabel: {
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: typography.labelMedium.fontSize,
    fontWeight: "600",
    color: colors.onSurfaceMuted,
    marginHorizontal: 2,
  },

  // Calendar grid
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    marginVertical: 2,
  },
  daySelected: {
    backgroundColor: colors.primary,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.onSurface,
  },
  dayTextSelected: {
    color: colors.onPrimary,
    fontWeight: "700",
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: "600",
  },
  dayOutside: {
    color: colors.onSurfaceMuted,
  },

  // Quick picks
  quickRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    width: "100%",
    justifyContent: "center",
  },
  quickBtn: {
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
  },
  quickLabel: {
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600",
    color: colors.primary,
  },

  // Chip
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  chipText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: "700",
    marginHorizontal: spacing.xs,
  },
  chipClear: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
