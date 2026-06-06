// ─────────────────────────────────────────────
// Smart Todo — Importance Selector (segmented)
// ─────────────────────────────────────────────

import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import type { Priority } from "../../types/item";
import { colors, typography, spacing, radius } from "../../theme";

const OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Med" },
  { value: "high", label: "High" },
  { value: "critical", label: "Crit" },
];

interface Props {
  value: Priority;
  onChange: (p: Priority) => void;
}

export function ImportanceSelector({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.option,
              active && styles.optionActive,
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                active && styles.labelActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.xs - 1,
    gap: spacing.xs - 1,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  optionActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: typography.labelLarge.fontSize,
    fontWeight: typography.labelLarge.fontWeight,
    color: colors.onSurfaceVariant,
  },
  labelActive: {
    color: colors.onPrimary,
  },
});
