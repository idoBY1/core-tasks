// ─────────────────────────────────────────────
// Smart Todo — Floating Action Button
// Material 3 design tokens, withTiming only
// ─────────────────────────────────────────────

import React, { useState, useCallback } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { colors, typography, spacing, radius, elevation, motion } from "../../theme";

interface Props {
  onCaptureTask: () => void;
  onCaptureNote: () => void;
}

export function CaptureFAB({ onCaptureTask, onCaptureNote }: Props) {
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      progress.value = withTiming(next ? 1 : 0, { duration: motion.fast });
      return next;
    });
  }, [progress]);

  const handleTask = useCallback(() => {
    setExpanded(false);
    progress.value = withTiming(0, { duration: motion.fast });
    onCaptureTask();
  }, [onCaptureTask, progress]);

  const handleNote = useCallback(() => {
    setExpanded(false);
    progress.value = withTiming(0, { duration: motion.fast });
    onCaptureNote();
  }, [onCaptureNote, progress]);

  // ── Animated styles ──────────────────────

  const mainRotation = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  const taskStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.6, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [12, 0]) },
    ],
    pointerEvents: progress.value > 0.5 ? "auto" : "none",
  }));

  const noteStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.6, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [12, 0]) },
    ],
    pointerEvents: progress.value > 0.5 ? "auto" : "none",
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.06]),
    pointerEvents: progress.value > 0.1 ? "auto" : "none",
  }));

  return (
    <>
      {/* Very light backdrop — just enough to focus attention */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={styles.overlayPressable} onPress={toggle} />
      </Animated.View>

      <View style={styles.container}>
        {/* Task option */}
        <Animated.View style={[styles.option, taskStyle]}>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={handleTask}
            activeOpacity={0.7}
          >
            <MaterialIcons name="assignment" size={22} color={colors.onSurfaceStrong} />
          </TouchableOpacity>
          <Text style={styles.optionLabel}>Task</Text>
        </Animated.View>

        {/* Note option */}
        <Animated.View style={[styles.option, noteStyle]}>
          <TouchableOpacity
            style={styles.optionBtn}
            onPress={handleNote}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit-note" size={22} color={colors.onSurfaceStrong} />
          </TouchableOpacity>
          <Text style={styles.optionLabel}>Note</Text>
        </Animated.View>

        {/* Main FAB */}
        <Animated.View style={[styles.fab, mainRotation]}>
          <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
            <Text style={styles.fabIcon}>＋</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.onSurface,
    zIndex: 90,
  },
  overlayPressable: { flex: 1 },
  container: {
    position: "absolute",
    bottom: spacing.xxxl,
    right: spacing.xl,
    alignItems: "center",
    zIndex: 100,
  },
  option: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  optionBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.level2,
  },
  optionLabel: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.level3,
  },
  fabIcon: { fontSize: 24, color: colors.onPrimary, fontWeight: "400" },
});
