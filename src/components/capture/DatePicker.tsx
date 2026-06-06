// ─────────────────────────────────────────────
// Smart Todo — Simple Calendar Date Picker
// ─────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
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

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface Props {
  value: Date | null;
  onChange: (date: Date) => void;
}

export function DatePicker({ value, onChange }: Props) {
  const [viewMonth, setViewMonth] = useState(value ?? new Date());

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

  return (
    <View style={styles.container}>
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

      {/* Day labels */}
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
            const selected = value ? isSameDay(day, value) : false;
            const today = checkIsToday(day);

            return (
              <TouchableOpacity
                key={di}
                style={[
                  styles.dayCell,
                  selected && styles.daySelected,
                  today && !selected && styles.dayToday,
                ]}
                onPress={() => onChange(day)}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.dayText,
                    !inMonth && styles.dayOutside,
                    selected && styles.dayTextSelected,
                    today && !selected && styles.dayTextToday,
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
        {[
          { label: "Today", date: new Date() },
          { label: "Tomorrow", date: addDays(new Date(), 1) },
        ].map((q) => (
          <TouchableOpacity
            key={q.label}
            style={styles.quickBtn}
            onPress={() => onChange(q.date)}
            activeOpacity={0.6}
          >
            <Text style={styles.quickLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
        {value && (
          <TouchableOpacity
            style={[styles.quickBtn, styles.clearBtn]}
            onPress={() => onChange(null as any)}
            activeOpacity={0.6}
          >
            <Text style={[styles.quickLabel, { color: colors.error }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },

  /* ── Month nav ─────────────────────────── */
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnText: {
    fontSize: 22,
    color: colors.onSurfaceVariant,
  },
  monthLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
  },

  /* ── Day headers ───────────────────────── */
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

  /* ── Calendar grid ─────────────────────── */
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

  /* ── Quick picks ───────────────────────── */
  quickRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  quickBtn: {
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
  },
  clearBtn: {
    backgroundColor: colors.errorContainer,
  },
  quickLabel: {
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600",
    color: colors.primary,
  },
});
