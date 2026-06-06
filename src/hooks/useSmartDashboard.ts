// ─────────────────────────────────────────────
// Smart Todo — useSmartDashboard Hook
// Computes which dashboard sections to show
// ─────────────────────────────────────────────

import { useMemo } from "react";
import type { Item, Task, Note } from "../types/item";
import { isTask, isNote } from "../types/item";
import type { DashboardCard, CardType } from "../types/dashboard";
import { CARD_CONFIG } from "../types/dashboard";
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

    // 2. High Priority — top 5 by user priority then importance score
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const highPriority = [...activeTasks]
      .sort((a, b) => {
        const pDiff = priorityOrder[a.userPriority] - priorityOrder[b.userPriority];
        if (pDiff !== 0) return pDiff;
        return b.importance - a.importance;
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

    // 4. Recent Notes — last 5 updated notes
    const recentNotes = active
      .filter(isNote)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);

    if (recentNotes.length > 0) {
      cards.push({
        type: "relevant_notes",
        ...CARD_CONFIG.relevant_notes,
        items: recentNotes,
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
