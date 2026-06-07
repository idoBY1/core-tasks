// ─────────────────────────────────────────────
// Smart Todo — Link Suggestion Card
// Suggest-link card with confirm/dismiss actions
// ─────────────────────────────────────────────

import React, { useCallback } from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { Item } from "../../types/item";
import { isTask } from "../../types/item";
import { confirmLink } from "../../services/linkingEngine";
import { useItemsStore } from "../../store/itemsStore";
import { colors, typography, spacing, radius, elevation } from "../../theme";

interface Props {
  fromItem: Item;
  toItem: Item;
  similarity: number;
  onConfirm?: () => void;
  onDismiss?: () => void;
}

export function LinkSuggestionCard({
  fromItem,
  toItem,
  similarity,
  onConfirm,
  onDismiss,
}: Props) {
  const dismissSuggestion = useItemsStore((s) => s.dismissSuggestion);

  const handleConfirm = useCallback(async () => {
    await confirmLink(fromItem.id, toItem.id, similarity);
    await confirmLink(toItem.id, fromItem.id, similarity);
    dismissSuggestion(fromItem.id, toItem.id);
    onConfirm?.();
  }, [fromItem, toItem, similarity, dismissSuggestion, onConfirm]);

  const handleDismiss = useCallback(() => {
    dismissSuggestion(fromItem.id, toItem.id);
    onDismiss?.();
  }, [fromItem, toItem, dismissSuggestion, onDismiss]);

  const percent = Math.round(similarity * 100);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="lightbulb-outline" size={16} color={colors.warning} />
        <Text style={styles.headerTitle}>Suggested Link</Text>
        <View style={styles.similarityBadge}>
          <Text style={styles.similarityText}>{percent}%</Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.itemsRow}>
        <View style={styles.itemChip}>
          <MaterialIcons
            name={isTask(fromItem) ? "assignment" : "description"}
            size={14}
            color={isTask(fromItem) ? colors.primary : colors.noteAccent}
          />
          <Text style={styles.itemLabel} numberOfLines={1}>
            {fromItem.title}
          </Text>
        </View>
        <MaterialIcons name="arrow-forward" size={14} color={colors.onSurfaceMuted} />
        <View style={styles.itemChip}>
          <MaterialIcons
            name={isTask(toItem) ? "assignment" : "description"}
            size={14}
            color={isTask(toItem) ? colors.primary : colors.noteAccent}
          />
          <Text style={styles.itemLabel} numberOfLines={1}>
            {toItem.title}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.7}>
          <MaterialIcons name="link" size={14} color={colors.onPrimary} />
          <Text style={styles.confirmText}>Link</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.7}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.warningContainer,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...elevation.level1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.labelMedium,
    fontWeight: "600",
    color: colors.warning,
    flex: 1,
  },
  similarityBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  similarityText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.warning,
  },
  itemsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  itemLabel: {
    ...typography.bodyMedium,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  confirmText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
    fontWeight: "600",
  },
  dismissBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  dismissText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
});
