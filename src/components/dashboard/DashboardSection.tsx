// ─────────────────────────────────────────────
// Smart Todo — Dashboard Section
// ─────────────────────────────────────────────

import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { DashboardCard } from "../../types/dashboard";
import type { Item } from "../../types/item";
import { ItemCard } from "../shared/ItemCard";
import { colors, typography, spacing, radius } from "../../theme";

interface Props {
  card: DashboardCard;
  onItemPress: (item: Item) => void;
  onItemComplete?: (id: string) => void;
  onItemArchive?: (id: string) => void;
}

export function DashboardSection({ card, onItemPress, onItemComplete, onItemArchive }: Props) {
  if (card.items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <MaterialIcons name={card.icon as any} size={20} color={colors.onSurfaceVariant} />
        <Text style={styles.title}>{card.title}</Text>
        <View style={styles.countPill}>
          <Text style={styles.count}>{card.items.length}</Text>
        </View>
      </View>

      <View style={styles.items}>
        {card.items.map((item) => (
          <View key={item.id} style={styles.itemWrapper}>
            <ItemCard
              item={item}
              onPress={onItemPress}
              onComplete={onItemComplete}
              onArchive={onItemArchive}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  icon: { fontSize: 18 },
  title: {
    ...typography.titleMedium,
    flex: 1,
  },
  countPill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  count: {
    ...typography.labelMedium,
  },
  items: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  itemWrapper: {},
});
