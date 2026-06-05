// ─────────────────────────────────────────────
// Smart Todo — Settings Store (Zustand)
// ─────────────────────────────────────────────

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  // Appearance
  colorScheme: "light" | "dark" | "system";

  // Dashboard
  showQuickWins: boolean;
  showSuggestions: boolean;
  defaultTaskPriority: "low" | "medium" | "high" | "critical";

  // Notifications
  dailySummaryEnabled: boolean;
  dailySummaryTime: string; // HH:mm
  reminderLeadMinutes: number; // minutes before due date

  // Semantic
  embeddingEnabled: boolean;
  autoLinkThreshold: number; // 0.0–1.0
  suggestLinkThreshold: number; // 0.0–1.0

  // Actions
  setColorScheme: (scheme: "light" | "dark" | "system") => void;
  setShowQuickWins: (v: boolean) => void;
  setShowSuggestions: (v: boolean) => void;
  setDefaultTaskPriority: (p: "low" | "medium" | "high" | "critical") => void;
  setDailySummaryEnabled: (v: boolean) => void;
  setDailySummaryTime: (t: string) => void;
  setReminderLeadMinutes: (m: number) => void;
  setEmbeddingEnabled: (v: boolean) => void;
  setAutoLinkThreshold: (v: number) => void;
  setSuggestLinkThreshold: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Defaults
      colorScheme: "system",
      showQuickWins: true,
      showSuggestions: true,
      defaultTaskPriority: "medium",
      dailySummaryEnabled: false,
      dailySummaryTime: "09:00",
      reminderLeadMinutes: 60,
      embeddingEnabled: false, // off until embedding service is implemented
      autoLinkThreshold: 0.7,
      suggestLinkThreshold: 0.5,

      // Setters
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setShowQuickWins: (showQuickWins) => set({ showQuickWins }),
      setShowSuggestions: (showSuggestions) => set({ showSuggestions }),
      setDefaultTaskPriority: (defaultTaskPriority) => set({ defaultTaskPriority }),
      setDailySummaryEnabled: (dailySummaryEnabled) => set({ dailySummaryEnabled }),
      setDailySummaryTime: (dailySummaryTime) => set({ dailySummaryTime }),
      setReminderLeadMinutes: (reminderLeadMinutes) => set({ reminderLeadMinutes }),
      setEmbeddingEnabled: (embeddingEnabled) => set({ embeddingEnabled }),
      setAutoLinkThreshold: (autoLinkThreshold) => set({ autoLinkThreshold }),
      setSuggestLinkThreshold: (suggestLinkThreshold) => set({ suggestLinkThreshold }),
    }),
    {
      name: "smart-todo-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
