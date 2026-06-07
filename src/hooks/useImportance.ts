// ─────────────────────────────────────────────
// Smart Todo — useImportance Hook
// Recalculates adaptive importance scores reactively
// ─────────────────────────────────────────────

import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import type { Item, Task } from "../types/item";
import { isTask } from "../types/item";
import {
  calculateAdaptiveScore,
  calculateAllAdaptiveScores,
  sortByAdaptiveScore,
} from "../services/importanceScorer";

// ── Types ──────────────────────────────────

export interface UseImportanceReturn {
  /** All tasks sorted by adaptive score (descending) */
  sortedTasks: Task[];
  /** Get the adaptive score for a specific task */
  getScore: (taskId: string) => number;
  /** Top N tasks by adaptive importance */
  topTasks: (n: number) => Task[];
  /** Force a full recalculation */
  recalculate: () => void;
  /** Timestamp of last recalculation */
  lastCalculated: Date | null;
}

// ── Hook ───────────────────────────────────

/**
 * Provides reactive adaptive importance scores for tasks.
 *
 * Scores recalculate:
 * - When the items list changes
 * - Every 60 seconds (to catch due-date urgency changes)
 * - Manually via `recalculate()`
 *
 * Usage:
 * ```tsx
 * const { sortedTasks, getScore, topTasks } = useImportance(items);
 * // sortedTasks[0] is the most important task right now
 * ```
 */
export function useImportance(
  items: Item[],
  refreshIntervalMs: number = 60_000
): UseImportanceReturn {
  const [tick, setTick] = useState(0);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Force recalculation
  const recalculate = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  // Periodic refresh to catch time-based urgency changes
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, refreshIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshIntervalMs]);

  // Compute scores whenever items or tick change
  const { scoreMap, sorted } = useMemo(() => {
    const now = new Date();
    const tasks = items.filter(isTask).filter((t) => t.status !== "done");
    const scores = calculateAllAdaptiveScores(items, now);
    const sortedTasks = [...tasks].sort((a, b) => {
      const scoreA = scores.get(a.id) ?? 0;
      const scoreB = scores.get(b.id) ?? 0;
      return scoreB - scoreA;
    });

    return { scoreMap: scores, sorted: sortedTasks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, tick]);

  // Update lastCalculated outside of render
  useEffect(() => {
    setLastCalculated(new Date());
  }, [tick]);

  // Memoised helpers
  const getScore = useCallback(
    (taskId: string): number => scoreMap.get(taskId) ?? 0,
    [scoreMap]
  );

  const topTasks = useCallback(
    (n: number): Task[] => sorted.slice(0, n),
    [sorted]
  );

  return {
    sortedTasks: sorted,
    getScore,
    topTasks,
    recalculate,
    lastCalculated,
  };
}
