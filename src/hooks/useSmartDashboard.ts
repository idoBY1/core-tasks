// ─────────────────────────────────────────────
// Smart Todo — useSmartDashboard Hook
// Computes which dashboard sections to show
// Uses adaptive importance scoring for intelligent ranking
// ─────────────────────────────────────────────

import { useMemo } from "react";
import type { Item, Task, Note } from "../types/item";
import { isTask, isNote } from "../types/item";
import type { DashboardCard, CardType } from "../types/dashboard";
import { CARD_CONFIG } from "../types/dashboard";
import { calculateAdaptiveScore } from "../services/importanceScorer";
import {
  isToday as checkIsToday,
  isTomorrow,
  parseISO,
  isValid,
  isBefore,
  startOfDay,
} from "date-fns";

function isDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  const d = parseISO(task.dueDate);
  return isValid(d) && checkIsToday(d);
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  const d = parseISO(task.dueDate);
  return isValid(d) && isBefore(d, startOfDay(new Date()));
}

function isQuickWin(task: Task): boolean {
  return (
    isOverdue(task) &&
    !task.subtasks?.length &&
    task.title.length < 60 &&
    task.status !== "done"
  );
}

export function useSmartDashboard(items: Item[]) {
  return useMemo(() => {
    const now = new Date();
    const active = items.filter((i) => i.archivedAt === null);
    const activeTasks = active.filter(isTask).filter((t) => t.status !== "done");
    const allTasks = active.filter(isTask);

    const cards: DashboardCard[] = [];

    // 1. Today's Schedule — tasks due today or tomorrow, sorted by time
    const todayTasks = activeTasks
      .filter((t) => isDueToday(t) || isTomorrow(parseISO(t.dueDate ?? "")))
      .sort((a, b) => {
        // Today before tomorrow, then by all-day last
        const aToday = isDueToday(a) ? 0 : 1;
        const bToday = isDueToday(b) ? 0 : 1;
        if (aToday !== bToday) return aToday - bToday;
        if (a.isAllDay !== b.isAllDay) return a.isAllDay ? 1 : -1;
        return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      });

    if (todayTasks.length > 0) {
      cards.push({
        type: "today",
        ...CARD_CONFIG.today,
        items: todayTasks,
      });
    }

    // 2. High Priority — top 5 by adaptive importance score (descending)
    //    The adaptive score combines user label, due urgency, dependency ratio,
    //    semantic context, recency, and sibling pressure (see importanceScorer).
    const highPriority = [...activeTasks]
      .sort((a, b) => {
        const scoreA = calculateAdaptiveScore(a, items, now);
        const scoreB = calculateAdaptiveScore(b, items, now);
        return scoreB - scoreA;
      })
      .slice(0, 5);

    if (highPriority.length > 0) {
      cards.push({
        type: "importance",
        ...CARD_CONFIG.importance,
        items: highPriority,
      });
    }

    // 3. Quick Wins — overdue, small tasks
    const quickWins = activeTasks.filter(isQuickWin).slice(0, 5);

    if (quickWins.length > 0) {
      cards.push({
        type: "quick_wins",
        ...CARD_CONFIG.quick_wins,
        items: quickWins,
      });
    }

    // 4. Relevant Notes — notes with semantic links to recently active tasks,
    //    falling back to most recently updated notes
    const recentTaskEmbeddings = activeTasks
      .filter((t) => t.embedding && t.lastTouchedAt)
      .sort(
        (a, b) =>
          (b.lastTouchedAt ?? "").localeCompare(a.lastTouchedAt ?? "")
      )
      .slice(0, 3)
      .map((t) => t.embedding!);

    const activeNotes = active.filter(isNote);

    let relevantNotes: Note[];
    if (recentTaskEmbeddings.length > 0) {
      // Score each note by max cosine similarity to any recent task
      const notesWithScore = activeNotes
        .filter((n) => n.embedding && n.embedding.length > 0)
        .map((note) => {
          let maxSim = 0;
          for (const taskEmb of recentTaskEmbeddings) {
            const sim = cosineSimilarity(note.embedding!, taskEmb);
            if (sim > maxSim) maxSim = sim;
          }
          return { note, sim: maxSim };
        })
        .filter((ns) => ns.sim > 0.1);

      notesWithScore.sort((a, b) => b.sim - a.sim);
      relevantNotes = notesWithScore.slice(0, 5).map((ns) => ns.note);

      // If no semantically similar notes found, fall back to recent
      if (relevantNotes.length === 0) {
        relevantNotes = activeNotes
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 5);
      }
    } else {
      // No task embeddings yet — fall back to recency
      relevantNotes = activeNotes
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5);
    }

    if (relevantNotes.length > 0) {
      cards.push({
        type: "relevant_notes",
        ...CARD_CONFIG.relevant_notes,
        items: relevantNotes,
      });
    }

    // 5. Recurring — tasks with recurrence due today
    const recurring = activeTasks.filter(
      (t) => t.recurrence && isDueToday(t)
    );

    if (recurring.length > 0) {
      cards.push({
        type: "recurring",
        ...CARD_CONFIG.recurring,
        items: recurring,
      });
    }

    // Stats for header
    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter((t) => t.status === "done").length;
    const totalNotes = active.filter(isNote).length;
    const overdueCount = activeTasks.filter(isOverdue).length;

    return {
      cards,
      stats: { totalTasks, doneTasks, totalNotes, overdueCount },
    };
  }, [items]);
}

// ── Local cosine similarity helper ─────────
function cosineSimilarity(a: number[], b: number[]): number {
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
  return denom === 0 ? 0 : dot / denom;
}
