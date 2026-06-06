// ─────────────────────────────────────────────
// Smart Todo — Material 3 Design Tokens
// ─────────────────────────────────────────────

import { StyleSheet } from "react-native";

// ── Colors ─────────────────────────────────

export const colors = {
  primary: "#2563eb",
  primaryDim: "#1d4ed8",
  primaryContainer: "#dbeafe",
  onPrimary: "#ffffff",

  secondary: "#7c3aed",
  secondaryContainer: "#ede9fe",

  surface: "#ffffff",
  surfaceDim: "#f8fafc",
  surfaceContainer: "#f1f5f9",
  surfaceContainerHigh: "#e2e8f0",

  onSurface: "#0f172a",
  onSurfaceStrong: "#1e293b",
  onSurfaceVariant: "#475569",
  onSurfaceMuted: "#94a3b8",

  outline: "#e2e8f0",
  outlineVariant: "#cbd5e1",

  error: "#dc2626",
  errorContainer: "#fee2e2",
  success: "#16a34a",
  successContainer: "#dcfce7",
  warning: "#d97706",
  warningContainer: "#fef3c7",

  noteAccent: "#6366f1",
  noteAccentContainer: "#eef2ff",

  overlay: "rgba(15, 23, 42, 0.04)",
  backdrop: "rgba(15, 23, 42, 0.5)",
} as const;

export const priorityColors = {
  low: { bg: "#f1f5f9", fg: "#64748b", accent: "#94a3b8" },
  medium: { bg: "#fef3c7", fg: "#b45309", accent: "#f59e0b" },
  high: { bg: "#ffedd5", fg: "#c2410c", accent: "#f97316" },
  critical: { bg: "#fee2e2", fg: "#b91c1c", accent: "#ef4444" },
} as const;

// ── Typography ─────────────────────────────

export const typography = StyleSheet.create({
  displayLarge: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.onSurface,
  },
  titleLarge: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.onSurface,
  },
  titleMedium: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.onSurface,
  },
  titleSmall: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.onSurface,
  },
  bodyLarge: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  labelLarge: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    color: colors.onSurfaceMuted,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.onSurfaceMuted,
  },
});

// ── Spacing ────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ── Radius ─────────────────────────────────

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 100,
} as const;

// ── Elevation (no harsh shadows) ───────────

export const elevation = {
  none: {},
  level1: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  level2: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  level3: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

// ── Component tokens ───────────────────────

export const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  padding: spacing.lg,
} as const;

export const inputStyle = {
  backgroundColor: colors.surfaceContainer,
  borderRadius: radius.md,
  padding: spacing.lg,
  fontSize: 15,
  color: colors.onSurface,
} as const;

export const buttonStyle = {
  filled: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tonal: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  text: {
    backgroundColor: "transparent",
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
} as const;

// ── Transition durations (no springs!) ─────

export const motion = {
  fast: 120,
  normal: 180,
  slow: 250,
} as const;
