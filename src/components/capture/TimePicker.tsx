// ─────────────────────────────────────────────
// Smart Todo — Time Picker
// Modal overlay: appears as a temporary picker,
// returns chosen time, then shows a compact chip.
// Uses plain ScrollView (no FlatList) so it's safe
// inside parent ScrollViews.
// ─────────────────────────────────────────────

import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { colors, typography, spacing, radius } from "../../theme";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

// ── Public interface ──────────────────────

interface TimePickerModalProps {
  visible: boolean;
  value: string; // "HH:mm"
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

interface TimeChipProps {
  time: string; // "HH:mm"
  onPress: () => void;
  onClear: () => void;
}

// ── Constants ─────────────────────────────

const ITEM_H = 40;
const VISIBLE = 5;
const PICKER_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function parseTime(str: string): [number, number] {
  const [h, m] = str.split(":").map(Number);
  return [h ?? 0, m ?? 0];
}

// ── Single scroll column ──────────────────

function Column({
  data,
  selected,
  onSelect,
}: {
  data: number[];
  selected: number;
  onSelect: (val: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const scrolling = useRef(false);
  const didInit = useRef(false);
  const lastOffsetY = useRef(0);

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      setTimeout(() => {
        ref.current?.scrollTo({ y: selected * ITEM_H, animated: false });
      }, 30);
    }
  }, []);

  const handleSnap = useCallback(
    (offsetY: number) => {
      const idx = Math.round(offsetY / ITEM_H);
      const clamped = Math.max(0, Math.min(data.length - 1, idx));
      ref.current?.scrollTo({ y: clamped * ITEM_H, animated: true });
      if (clamped !== selected) {
        onSelect(clamped);
        Haptics.selectionAsync();
      }
      scrolling.current = false;
    },
    [data, selected, onSelect]
  );

  const onScroll = useCallback(
    (e: any) => {
      // Capture offset synchronously before event is recycled
      lastOffsetY.current = e.nativeEvent.contentOffset.y;
    },
    []
  );

  const onMomentumEnd = useCallback(
    () => {
      handleSnap(lastOffsetY.current);
    },
    [handleSnap]
  );

  const onDragEnd = useCallback(
    () => {
      if (!scrolling.current) return;
      // Use captured offset — safe from event recycling
      setTimeout(() => handleSnap(lastOffsetY.current), 50);
    },
    [handleSnap]
  );

  return (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: PAD }}
      style={[styles.column, { height: PICKER_H }]}
      onScrollBeginDrag={() => { scrolling.current = true; }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onMomentumScrollEnd={onMomentumEnd}
      onScrollEndDrag={onDragEnd}
    >
      {data.map((item) => {
        const active = item === selected;
        return (
          <TouchableOpacity
            key={item}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => {
              const idx = data.indexOf(item);
              ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
              onSelect(idx);
              Haptics.selectionAsync();
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.itemText, active && styles.itemTextActive]}>
              {pad(item)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Modal Time Picker ─────────────────────

export function TimePickerModal({ visible, value, onConfirm, onCancel }: TimePickerModalProps) {
  const [previewTime, setPreviewTime] = useState(value);
  const [previewH, setPreviewH] = useState(0);
  const [previewM, setPreviewM] = useState(0);

  // Reset preview when modal opens
  useEffect(() => {
    if (visible) {
      setPreviewTime(value);
      const [nh, nm] = parseTime(value);
      setPreviewH(nh);
      setPreviewM(nm);
    }
  }, [visible, value]);

  const handleSetHour = useCallback((idx: number) => {
    setPreviewH(idx);
    setPreviewTime((prev) => `${pad(idx)}:${pad(parseTime(prev)[1])}`);
  }, []);

  const handleSetMinute = useCallback((idx: number) => {
    setPreviewM(idx);
    setPreviewTime((prev) => `${pad(parseTime(prev)[0])}:${pad(idx)}`);
  }, []);

  const presets = ["08:00", "09:00", "12:00", "13:00", "17:00", "18:00"];

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
            <Text style={styles.modalTitle}>Pick Time</Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onConfirm(previewTime); }} style={styles.modalHeaderBtn}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.previewRow}>
            <MaterialIcons name="access-time" size={22} color={colors.primary} />
            <Text style={styles.previewText}>{previewTime}</Text>
          </View>

          {/* Columns */}
          <View style={styles.pickerRow}>
            <Column data={HOURS} selected={previewH} onSelect={handleSetHour} />
            <View style={styles.separator}>
              <Text style={styles.separatorText}>:</Text>
            </View>
            <Column data={MINUTES} selected={previewM} onSelect={handleSetMinute} />
          </View>

          {/* Quick presets */}
          <View style={styles.presets}>
            {presets.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.preset, previewTime === t && styles.presetActive]}
                onPress={() => {
                  const [ph, pm] = parseTime(t);
                  setPreviewH(ph);
                  setPreviewM(pm);
                  setPreviewTime(t);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetText, previewTime === t && styles.presetTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Compact Time Chip (shown after selection) ──

export function TimeChip({ time, onPress, onClear }: TimeChipProps) {
  return (
    <View style={styles.chip}>
      <TouchableOpacity style={styles.chipContent} onPress={onPress} activeOpacity={0.7}>
        <MaterialIcons name="access-time" size={16} color={colors.primary} />
        <Text style={styles.chipText}>{time}</Text>
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
    maxWidth: 320,
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
  modalHeaderBtn: {
    padding: spacing.sm,
  },
  modalTitle: {
    ...typography.titleMedium,
  },
  modalCancelText: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
  },
  modalDoneText: {
    ...typography.bodyLarge,
    color: colors.primary,
    fontWeight: "700",
  },

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
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },

  // Columns
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  column: {
    width: 64,
  },
  separator: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  separatorText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.onSurface,
  },
  item: {
    height: ITEM_H,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  itemActive: {
    backgroundColor: colors.primary,
  },
  itemText: {
    fontSize: 18,
    fontWeight: "400",
    color: colors.onSurfaceMuted,
    fontVariant: ["tabular-nums"],
  },
  itemTextActive: {
    color: colors.onPrimary,
    fontWeight: "700",
  },

  // Presets
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
    justifyContent: "center",
  },
  preset: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
  },
  presetActive: {
    backgroundColor: colors.primaryContainer,
  },
  presetText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
  },
  presetTextActive: {
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
    fontVariant: ["tabular-nums"],
    marginHorizontal: spacing.xs,
  },
  chipClear: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
