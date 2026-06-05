// ─────────────────────────────────────────────
// Smart Todo — Dashboard Card Types
// ─────────────────────────────────────────────

import type { Item, Task, Note } from "./item";

export type CardType =
  | "today"
  | "importance"
  | "relevant_notes"
  | "recurring"
  | "suggestions"
  | "quick_wins";

export interface DashboardCard {
  type: CardType;
  title: string;
  icon: string;
  items: Item[];
  priority: number; // display order (lower = higher on screen)
}

export const CARD_CONFIG: Record<CardType, { title: string; icon: string; priority: number }> = {
  today:          { title: "Today's Schedule",      icon: "📅", priority: 0 },
  importance:     { title: "High Priority",          icon: "🔥", priority: 1 },
  relevant_notes: { title: "Relevant Notes",         icon: "📝", priority: 2 },
  recurring:      { title: "Recurring",              icon: "🔁", priority: 3 },
  suggestions:    { title: "Suggestions",            icon: "💡", priority: 4 },
  quick_wins:     { title: "Quick Wins",             icon: "⚡", priority: 5 },
};
