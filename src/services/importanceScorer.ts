// ─────────────────────────────────────────────
// Smart Todo — Importance Scoring Engine
// Adaptive importance: never shown to users, only used for ranking
// ─────────────────────────────────────────────

import type { Item, Task, Priority } from "../types/item";
import { isTask, PRIORITY_BASE_WEIGHT } from "../types/item";
import {
  parseISO,
  isValid,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  startOfDay,
} from "date-fns";

// ── Weights (from plan §2.5) ──────────────

const WEIGHTS = {
  userBase: 0.35,
  dueUrgency: 0.25,
  dependencyRatio: 0.15,
  semanticContext: 0.10,
  recency: 0.10,
  siblingPressure: 0.05,
} as const;

// ── Public API ─────────────────────────────

/**
 * Calculate the adaptive importance score for a task.
 * Returns a value between 0.0 and 1.0.
 * 
 * Formula (from plan §2.5):
 *   score = clamp(0, 1,
 *     userBaseWeight       × 0.35
 *     + dueUrgency         × 0.25
 *     + dependencyRatio    × 0.15
 *     + semanticContext    × 0.10
 *     + recency            × 0.10
 *     + siblingPressure    × 0.05
 *   )
 */
export function calculateAdaptiveScore(
  task: Task,
  allItems: Item[],
  now: Date = new Date()
): number {
  const userBase = userBaseWeight(task.userPriority);
  const urgency = dueUrgency(now, task.dueDate);
  const dependency = dependencyRatio(task, allItems);
  const semanticContext = semanticContextRelevance(task, allItems);
  const recency = recencyScore(now, task.lastTouchedAt ?? task.updatedAt);
  const siblingPressure = siblingPressureScore(task, allItems);

  const raw =
    userBase * WEIGHTS.userBase +
    urgency * WEIGHTS.dueUrgency +
    dependency * WEIGHTS.dependencyRatio +
    semanticContext * WEIGHTS.semanticContext +
    recency * WEIGHTS.recency +
    siblingPressure * WEIGHTS.siblingPressure;

  return clamp(raw, 0, 1);
}

/**
 * Batch-calculate adaptive scores for all tasks in the list.
 * Returns a map of taskId → score.
 */
export function calculateAllAdaptiveScores(
  items: Item[],
  now: Date = new Date()
): Map<string, number> {
  const scores = new Map<string, number>();
  const tasks = items.filter(isTask);

  for (const task of tasks) {
    scores.set(task.id, calculateAdaptiveScore(task, items, now));
  }

  return scores;
}

/**
 * Sort tasks by adaptive score (descending — highest importance first).
 */
export function sortByAdaptiveScore(
  tasks: Task[],
  allItems: Item[],
  now: Date = new Date()
): Task[] {
  return [...tasks].sort((a, b) => {
    const scoreA = calculateAdaptiveScore(a, allItems, now);
    const scoreB = calculateAdaptiveScore(b, allItems, now);
    return scoreB - scoreA;
  });
}

// ── Score Components ───────────────────────

/**
 * User base weight — the label seed.
 * Maps user-facing priority to a 0–1 value.
 */
function userBaseWeight(priority: Priority): number {
  return PRIORITY_BASE_WEIGHT[priority];
}

/**
 * Due urgency — ramps up as the due date approaches.
 * 1.0 when overdue, ~0.0 when >7 days away.
 */
function dueUrgency(now: Date, dueDate: string | null): number {
  if (!dueDate) return 0; // no due date → no urgency

  const due = parseISO(dueDate);
  if (!isValid(due)) return 0;

  const daysUntilDue = differenceInDays(due, startOfDay(now));

  if (daysUntilDue < 0) {
    // Overdue — the more overdue, the more urgent (cap at 1.0)
    const overdueDays = Math.abs(daysUntilDue);
    return Math.min(1.0, 0.8 + overdueDays * 0.05);
  }

  if (daysUntilDue === 0) {
    // Due today — check how many hours left
    const hoursUntilDue = differenceInHours(due, now);
    if (hoursUntilDue <= 0) return 0.9; // past the time
    if (hoursUntilDue <= 2) return 0.85;
    return 0.75;
  }

  if (daysUntilDue === 1) return 0.6; // tomorrow
  if (daysUntilDue <= 3) return 0.4;
  if (daysUntilDue <= 7) return 0.2;

  // Linear decay from 0.2 to 0 over days 7–30
  if (daysUntilDue <= 30) {
    return 0.2 * (1 - (daysUntilDue - 7) / 23);
  }

  return 0;
}

/**
 * Dependency ratio — how many subtasks are completed.
 * 1.0 when all done (boosts parent), 0.0 when none done.
 */
function dependencyRatio(task: Task, allItems: Item[]): number {
  const subtasks = allItems.filter(
    (i) => isTask(i) && i.parentId === task.id
  ) as Task[];

  if (subtasks.length === 0) return 0.5; // no subtasks → neutral

  const completed = subtasks.filter((st) => st.status === "done").length;
  return completed / subtasks.length;
}

/**
 * Semantic context relevance — similarity to recently active items.
 * Uses cosine similarity of embeddings if available.
 * Returns 0.0–1.0.
 */
function semanticContextRelevance(task: Task, allItems: Item[]): number {
  if (!task.embedding || task.embedding.length === 0) return 0;

  // Find recently active items (last 24h)
  const recentItems = allItems.filter((item) => {
    if (item.id === task.id) return false;
    if (!item.embedding || item.embedding.length === 0) return false;
    if (!item.lastTouchedAt) return false;
    const touched = parseISO(item.lastTouchedAt);
    const hoursSince = differenceInHours(new Date(), touched);
    return hoursSince <= 24;
  });

  if (recentItems.length === 0) return 0;

  // Average similarity to recently active items
  let totalSimilarity = 0;
  let count = 0;

  for (const item of recentItems) {
    const sim = cosineSimilarity(task.embedding, item.embedding!);
    if (sim > 0) {
      totalSimilarity += sim;
      count++;
    }
  }

  return count > 0 ? totalSimilarity / count : 0;
}

/**
 * Recency — how recently the task was touched.
 * 1.0 for just-touched, decays toward 0.0 over ~7 days.
 */
function recencyScore(now: Date, lastTouchedAt: string | null): number {
  if (!lastTouchedAt) return 0.3; // never touched — neutral-low

  const touched = parseISO(lastTouchedAt);
  if (!isValid(touched)) return 0.3;

  const minutesSince = differenceInMinutes(now, touched);
  if (minutesSince < 0) return 1.0; // future? treat as fresh

  // Exponential decay: half-life ~24 hours
  // score = e^(-λt)  where λ = ln(2)/24h ≈ 0.0289 per hour
  const hoursSince = minutesSince / 60;
  const lambda = Math.LN2 / 24;
  const score = Math.exp(-lambda * hoursSince);

  // Clamp floor at 0.05 so long-forgotten tasks aren't completely invisible
  return Math.max(0.05, score);
}

/**
 * Sibling pressure — how many other tasks compete at the same priority level.
 * More competition → slightly higher score (user has many things at this level).
 */
function siblingPressureScore(task: Task, allItems: Item[]): number {
  const siblings = allItems.filter(
    (i) =>
      isTask(i) &&
      i.id !== task.id &&
      i.userPriority === task.userPriority &&
      i.status !== "done" &&
      i.archivedAt === null
  );

  // Normalize: 0 siblings → 0.0, 10+ siblings → 1.0
  return clamp(siblings.length / 10, 0, 1);
}

// ── Utilities ──────────────────────────────

/** Cosine similarity between two vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dot / denom;
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
