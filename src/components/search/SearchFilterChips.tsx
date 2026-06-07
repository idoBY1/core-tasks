// ─────────────────────────────────────────────
// Smart Todo — Search Filter Chips
// Horizontal scrolling filter row for the search overlay
// ─────────────────────────────────────────────

import React, { useCallback } from "react";
import { Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { SearchFilter } from "../../services/semanticSearch";
import { colors, typography, spacing, radius } from "../../theme";

// ── Filter definitions ─────────────────────

interface FilterOption {
  key: SearchFilter;
  label: string;
  icon: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { key: "tasks", label: "Tasks", icon: "assignment" },
  { key: "notes", label: "Notes", icon: "description" },
  { key: "today", label: "Today", icon: "today" },
  { key: "this_week", label: "This Week", icon: "date-range" },
  { key: "high_importance", label: "High Priority", icon: "local-fire-department" },
  { key: "recurring", label: "Recurring", icon: "repeat" },
];

// ── Mutually exclusive filter groups ───────
// tasks/notes are exclusive with each other
// today/this_week are exclusive with each other

const EXCLUSIVE_GROUPS: SearchFilter[][] = [
  ["tasks", "notes"],
  ["today", "this_week"],
];

// ── Props ──────────────────────────────────

interface Props {
  active: SearchFilter[];
  onChange: (filters: SearchFilter[]) => void;
}

// ── Component ──────────────────────────────

export function SearchFilterChips({ active, onChange }: Props) {
  const toggle = useCallback(
    (key: SearchFilter) => {
      const isActive = active.includes(key);

      if (isActive) {
        // Remove
        onChange(active.filter((f) => f !== key));
        return;
      }

      // Check exclusive groups
      let next = [...active];
      for (const group of EXCLUSIVE_GROUPS) {
        if (group.includes(key)) {
          // Remove others in the same group
          next = next.filter((f) => !group.includes(f));
        }
      }

      next.push(key);
      onChange(next);
    },
    [active, onChange]
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {FILTER_OPTIONS.map((opt) => {
        const isActive = active.includes(opt.key);
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => toggle(opt.key)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={opt.icon as any}
              size={16}
              color={isActive ? colors.onPrimary : colors.onSurfaceVariant}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  labelActive: {
    color: colors.onPrimary,
    fontWeight: "600",
  },
});
