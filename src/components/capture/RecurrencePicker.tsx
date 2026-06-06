// ─────────────────────────────────────────────
// Smart Todo — Recurrence Picker
// Daily: no date needed. Weekly: pick days. Monthly: pick day number.
// ─────────────────────────────────────────────

import React, { useCallback } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { DayOfWeek, RecurrenceFrequency } from "../../types/item";
import { colors, typography, spacing, radius } from "../../theme";

export type RecurrenceOption = RecurrenceFrequency | "none";

export interface RecurrenceValue {
  frequency: RecurrenceOption;
  daysOfWeek: DayOfWeek[];
  daysOfMonth: number[];
}

interface Props {
  value: RecurrenceValue;
  onChange: (val: RecurrenceValue) => void;
}

const FREQUENCIES: { value: RecurrenceOption; label: string }[] = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAY_LABELS: { day: DayOfWeek; short: string }[] = [
  { day: 1, short: "Mo" },
  { day: 2, short: "Tu" },
  { day: 3, short: "We" },
  { day: 4, short: "Th" },
  { day: 5, short: "Fr" },
  { day: 6, short: "Sa" },
  { day: 0, short: "Su" },
];

const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export function RecurrencePicker({ value, onChange }: Props) {
  const setFrequency = useCallback(
    (freq: RecurrenceOption) => {
      onChange({
        frequency: freq,
        daysOfWeek: freq === "weekly" ? value.daysOfWeek : [],
        daysOfMonth: freq === "monthly" ? value.daysOfMonth : [],
      });
    },
    [value, onChange]
  );

  const toggleDay = useCallback(
    (day: DayOfWeek) => {
      const next = value.daysOfWeek.includes(day)
        ? value.daysOfWeek.filter((d) => d !== day)
        : [...value.daysOfWeek, day];
      onChange({ ...value, daysOfWeek: next });
    },
    [value, onChange]
  );

  const toggleDayOfMonth = useCallback(
    (day: number) => {
      const next = value.daysOfMonth.includes(day)
        ? value.daysOfMonth.filter((d) => d !== day)
        : [...value.daysOfMonth, day];
      onChange({ ...value, daysOfMonth: next });
    },
    [value, onChange]
  );

  return (
    <View style={styles.container}>
      {/* Frequency selector */}
      <View style={styles.freqRow}>
        {FREQUENCIES.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.freqBtn,
              value.frequency === opt.value && styles.freqBtnActive,
            ]}
            onPress={() => setFrequency(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.freqLabel,
                value.frequency === opt.value && styles.freqLabelActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily hint */}
      {value.frequency === "daily" && (
        <View style={styles.hintRow}>
          <MaterialIcons name="info-outline" size={14} color={colors.onSurfaceMuted} />
          <Text style={styles.hintText}>Repeats every day — no date needed</Text>
        </View>
      )}

      {/* Weekly: day-of-week chips */}
      {value.frequency === "weekly" && (
        <View style={styles.weekSection}>
          <Text style={styles.subLabel}>On which days?</Text>
          <View style={styles.dayChipRow}>
            {DAY_LABELS.map(({ day, short }) => {
              const active = value.daysOfWeek.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => toggleDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                    {short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Monthly: day-of-month grid — multi-select */}
      {value.frequency === "monthly" && (
        <View style={styles.monthSection}>
          <Text style={styles.subLabel}>On which days? ({value.daysOfMonth.length} selected)</Text>
          <View style={styles.monthGrid}>
            {MONTH_DAYS.map((day) => {
              const active = value.daysOfMonth.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.monthDay, active && styles.monthDayActive]}
                  onPress={() => toggleDayOfMonth(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.monthDayText, active && styles.monthDayTextActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },

  // Frequency selector
  freqRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
  },
  freqBtnActive: {
    backgroundColor: colors.primary,
  },
  freqLabel: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
  },
  freqLabelActive: {
    color: colors.onPrimary,
  },

  // Hint (daily)
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
  },
  hintText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceMuted,
  },

  // Weekly
  weekSection: {
    marginTop: spacing.lg,
  },
  subLabel: {
    ...typography.bodyMedium,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  dayChipRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dayChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: {
    backgroundColor: colors.primary,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  dayChipTextActive: {
    color: colors.onPrimary,
  },

  // Monthly
  monthSection: {
    marginTop: spacing.lg,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  monthDay: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  monthDayActive: {
    backgroundColor: colors.primary,
  },
  monthDayText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.onSurfaceVariant,
  },
  monthDayTextActive: {
    color: colors.onPrimary,
    fontWeight: "700",
  },
});
