// ─────────────────────────────────────────────
// Smart Todo — Linked Items List
// Shows auto-linked items in detail sheets
// ─────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { Item } from "../../types/item";
import { isTask } from "../../types/item";
import { getResolvedLinks, removeLink } from "../../services/linkingEngine";
import { useItemsStore } from "../../store/itemsStore";
import { colors, typography, spacing, radius } from "../../theme";

interface LinkedItem {
  linked: Item;
  similarity: number;
  auto: boolean;
}

interface Props {
  itemId: string;
  onItemPress: (item: Item) => void;
}

export function LinkedItemsList({ itemId, onItemPress }: Props) {
  const items = useItemsStore((s) => s.items);
  const [links, setLinks] = useState<LinkedItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolved = await getResolvedLinks(itemId, items);
        if (!cancelled) setLinks(resolved);
      } catch {
        if (!cancelled) setLinks([]);
      }
    })();
    return () => { cancelled = true; };
  }, [itemId, items]);

  const handleRemove = useCallback(
    async (linkedId: string) => {
      // Find and remove the link
      const linkId = `${itemId}-${linkedId}`;
      const reverseId = `${linkedId}-${itemId}`;
      try {
        await removeLink(linkId);
        await removeLink(reverseId);
        setLinks((prev) => prev.filter((l) => l.linked.id !== linkedId));
      } catch {
        // ignore
      }
    },
    [itemId]
  );

  if (links.length === 0) return null;

  const visibleLinks = expanded ? links : links.slice(0, 3);
  const hasMore = links.length > 3;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="link" size={16} color={colors.onSurfaceVariant} />
        <Text style={styles.headerTitle}>
          Linked Items ({links.length})
        </Text>
      </View>

      {visibleLinks.map((link) => (
        <TouchableOpacity
          key={link.linked.id}
          style={styles.linkRow}
          onPress={() => onItemPress(link.linked)}
          activeOpacity={0.7}
        >
          <View style={styles.linkIcon}>
            <MaterialIcons
              name={isTask(link.linked) ? "assignment" : "description"}
              size={16}
              color={isTask(link.linked) ? colors.primary : colors.noteAccent}
            />
          </View>
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle} numberOfLines={1}>
              {link.linked.title}
            </Text>
            <Text style={styles.linkMeta}>
              {Math.round(link.similarity * 100)}% similar
              {link.auto ? " · auto" : " · manual"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleRemove(link.linked.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={16} color={colors.onSurfaceMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {hasMore && (
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandText}>
            {expanded ? "Show less" : `Show ${links.length - 3} more`}
          </Text>
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.labelLarge,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  linkContent: {
    flex: 1,
    gap: 1,
  },
  linkTitle: {
    ...typography.bodyMedium,
    fontWeight: "500",
  },
  linkMeta: {
    ...typography.labelMedium,
    color: colors.onSurfaceMuted,
  },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  expandText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: "600",
  },
});
