// ─────────────────────────────────────────────
// Smart Todo — Search Overlay
// Full-screen semantic search with filters and results
// ─────────────────────────────────────────────

import React, { useCallback, useRef } from "react";
import {
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import type { Item } from "../../types/item";
import { useItemsStore } from "../../store/itemsStore";
import { useSemanticSearch } from "../../hooks/useSemanticSearch";
import type { SearchFilter } from "../../services/semanticSearch";
import { SearchFilterChips } from "./SearchFilterChips";
import { SearchResultItem } from "./SearchResultItem";
import { colors, typography, spacing, radius, elevation, motion } from "../../theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onItemPress: (item: Item) => void;
}

export function SearchOverlay({ visible, onClose, onItemPress }: Props) {
  const items = useItemsStore((s) => s.items);
  const inputRef = useRef<TextInput>(null);
  const [filters, setFilters] = React.useState<SearchFilter[]>([]);

  const {
    results,
    loading,
    error,
    query,
    setQuery,
    clear,
    lastMethod,
  } = useSemanticSearch(items, { filters, limit: 30 });

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    clear();
    setFilters([]);
    onClose();
  }, [clear, onClose]);

  const handleItemPress = useCallback(
    (item: Item) => {
      Keyboard.dismiss();
      onItemPress(item);
      handleClose();
    },
    [onItemPress, handleClose]
  );

  const handleClearQuery = useCallback(() => {
    clear();
    inputRef.current?.focus();
  }, [clear]);

  if (!visible) return null;

  return (
    <Animated.View
      style={styles.overlay}
      entering={FadeIn.duration(motion.normal)}
      exiting={FadeOut.duration(motion.fast)}
    >
      {/* Header: search bar + close */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.onSurfaceMuted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks & notes…"
            placeholderTextColor={colors.onSurfaceMuted}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearQuery} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={18} color={colors.onSurfaceMuted} />
            </TouchableOpacity>
          )}
          {loading && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          )}
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <SearchFilterChips active={filters} onChange={setFilters} />

      {/* Status bar: method + count */}
      {query.length > 0 && !loading && (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {results.length} result{results.length !== 1 ? "s" : ""}
          </Text>
          {lastMethod && (
            <View style={styles.methodBadge}>
              <MaterialIcons
                name={lastMethod === "keyword" ? "text-fields" : "psychology"}
                size={12}
                color={colors.onSurfaceMuted}
              />
              <Text style={styles.methodText}>
                {lastMethod === "hybrid" ? "semantic" : lastMethod}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorRow}>
          <MaterialIcons name="warning" size={16} color={colors.warning} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {query.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="manage-search" size={48} color={colors.onSurfaceMuted} />
          <Text style={styles.emptyTitle}>Search your items</Text>
          <Text style={styles.emptySubtitle}>
            Type to search across all tasks and notes
          </Text>
        </View>
      ) : results.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="search-off" size={48} color={colors.onSurfaceMuted} />
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptySubtitle}>
            Try different keywords or adjust filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item: result }) => (
            <SearchResultItem result={result} onPress={handleItemPress} />
          )}
        />
      )}
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    zIndex: 200,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xxxl + spacing.md, // safe area
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.surface,
    ...elevation.level1,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyLarge,
    padding: 0, // remove default RN padding
  },
  spinner: {
    marginLeft: spacing.xs,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
  },
  statusText: {
    ...typography.labelMedium,
    color: colors.onSurfaceMuted,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  methodText: {
    fontSize: 11,
    color: colors.onSurfaceMuted,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warningContainer,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.warning,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  emptyTitle: {
    ...typography.titleMedium,
    color: colors.onSurfaceMuted,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceMuted,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
});
