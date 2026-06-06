// ─────────────────────────────────────────────
// Smart Todo — Importance Badge (Material 3 chip)
// ─────────────────────────────────────────────

import React from "react";
import { Text, View, StyleSheet } from "react-native";
import type { Priority } from "../../types/item";
import { priorityColors, typography, spacing, radius } from "../../theme";

const LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  critical: "Crit",
};

export function ImportanceBadge({ priority }: { priority: Priority }) {
  const { bg, fg } = priorityColors[priority];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{LABELS[priority]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: typography.labelMedium.fontSize,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
