// ─────────────────────────────────────────────
// Smart Todo — Semantic Search Service
// Vector similarity search with hybrid keyword fallback
// ─────────────────────────────────────────────

import type { Item } from "../types/item";
import { generateEmbedding } from "./embeddings";
import { cosineSimilarity } from "./importanceScorer";

// ── Types ──────────────────────────────────

export interface SearchResult {
  item: Item;
  score: number;          // combined score 0–1
  vectorScore: number;    // cosine similarity component
  keywordScore: number;   // keyword match component
  method: "hybrid" | "vector" | "keyword";
}

export type SearchFilter =
  | "tasks"
  | "notes"
  | "today"
  | "this_week"
  | "high_importance"
  | "recurring";

// ── Public API ─────────────────────────────

/**
 * Search items using semantic vector similarity combined with keyword matching.
 * Returns results sorted by relevance (descending).
 */
export async function searchItems(
  query: string,
  items: Item[],
  filters: SearchFilter[] = []
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Apply filters first
  const filtered = applyFilters(items, filters);

  // Generate query embedding
  const { vector: queryVector, method } = await generateEmbedding(trimmed);
  const hasQueryEmbedding = queryVector.some((v) => v !== 0);

  // Score each item
  const results: SearchResult[] = [];

  for (const item of filtered) {
    let vectorScore = 0;
    let keywordScore = 0;

    // Vector similarity (if embeddings available)
    if (hasQueryEmbedding && item.embedding && item.embedding.length > 0) {
      vectorScore = cosineSimilarity(queryVector, item.embedding);
    }

    // Keyword similarity (always computed as fallback / supplement)
    keywordScore = keywordMatchScore(trimmed, item);

    // Combine scores
    let combinedScore: number;
    let resultMethod: SearchResult["method"];

    if (vectorScore > 0 && keywordScore > 0) {
      // Hybrid: weighted average favoring vector when both are present
      combinedScore = vectorScore * 0.6 + keywordScore * 0.4;
      resultMethod = "hybrid";
    } else if (vectorScore > 0) {
      combinedScore = vectorScore;
      resultMethod = "vector";
    } else {
      combinedScore = keywordScore;
      resultMethod = "keyword";
    }

    // Only include items with some relevance
    if (combinedScore > 0.05) {
      results.push({
        item,
        score: combinedScore,
        vectorScore,
        keywordScore,
        method: resultMethod,
      });
    }
  }

  // Sort by combined score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Quick keyword-only search — no embeddings needed.
 * Useful for instant filtering while embeddings load.
 */
export function searchItemsKeyword(
  query: string,
  items: Item[],
  filters: SearchFilter[] = []
): SearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const filtered = applyFilters(items, filters);
  const results: SearchResult[] = [];

  for (const item of filtered) {
    const score = keywordMatchScore(trimmed, item);
    if (score > 0.05) {
      results.push({
        item,
        score,
        vectorScore: 0,
        keywordScore: score,
        method: "keyword",
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Find items semantically similar to a given item.
 * Returns the top N most similar items.
 */
export async function findSimilarItems(
  target: Item,
  allItems: Item[],
  limit: number = 5,
  threshold: number = 0.5
): Promise<SearchResult[]> {
  if (!target.embedding || target.embedding.length === 0) {
    // Fall back to keyword-based similarity
    return searchItemsKeyword(target.title, allItems).slice(0, limit);
  }

  const results: SearchResult[] = [];

  for (const item of allItems) {
    if (item.id === target.id) continue;
    if (!item.embedding || item.embedding.length === 0) continue;

    const score = cosineSimilarity(target.embedding, item.embedding);
    if (score >= threshold) {
      results.push({
        item,
        score,
        vectorScore: score,
        keywordScore: 0,
        method: "vector",
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// ── Keyword matching ───────────────────────

/**
 * TF-IDF-inspired keyword match score.
 * Returns 0.0–1.0 based on term overlap weighted by field importance.
 */
function keywordMatchScore(query: string, item: Item): number {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return 0;

  const titleText = item.title.toLowerCase();
  const contentText = (item.content ?? "").toLowerCase();
  const tagText = item.tags.join(" ").toLowerCase();
  const combinedText = `${titleText} ${contentText} ${tagText}`;

  let matchScore = 0;
  let matchedTerms = 0;

  for (const term of queryTerms) {
    // Title match (highest weight)
    if (titleText.includes(term)) {
      matchScore += 0.5;
      matchedTerms++;
      // Exact title start bonus
      if (titleText.startsWith(term)) matchScore += 0.15;
    }
    // Content match
    else if (contentText.includes(term)) {
      matchScore += 0.25;
      matchedTerms++;
    }
    // Tag match
    else if (tagText.includes(term)) {
      matchScore += 0.3;
      matchedTerms++;
    }
    // Fuzzy: check if any word in the item starts with the term
    else {
      const words = combinedText.split(/\s+/);
      const partialMatch = words.some(
        (w) => w.startsWith(term) && w.length > term.length
      );
      if (partialMatch) {
        matchScore += 0.1;
        matchedTerms++;
      }
    }
  }

  // Coverage bonus — reward matching more query terms
  const coverage = matchedTerms / queryTerms.length;
  matchScore *= 0.5 + 0.5 * coverage;

  // Exact phrase bonus in title
  if (titleText.includes(query)) {
    matchScore += 0.3;
  } else if (contentText.includes(query)) {
    matchScore += 0.15;
  }

  return Math.min(1, matchScore);
}

// ── Filtering ──────────────────────────────

function applyFilters(items: Item[], filters: SearchFilter[]): Item[] {
  if (filters.length === 0) return items;

  return items.filter((item) => {
    if (item.archivedAt !== null) return false;

    for (const filter of filters) {
      switch (filter) {
        case "tasks":
          if (item.type !== "task") return false;
          break;
        case "notes":
          if (item.type !== "note") return false;
          break;
        case "today": {
          if (item.type !== "task" || !item.dueDate) return false;
          const due = new Date(item.dueDate);
          const today = new Date();
          if (
            due.getFullYear() !== today.getFullYear() ||
            due.getMonth() !== today.getMonth() ||
            due.getDate() !== today.getDate()
          )
            return false;
          break;
        }
        case "this_week": {
          if (item.type !== "task" || !item.dueDate) return false;
          const due = new Date(item.dueDate);
          const now = new Date();
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (due < now || due > weekEnd) return false;
          break;
        }
        case "high_importance": {
          if (item.type !== "task") return false;
          if (
            item.userPriority !== "high" &&
            item.userPriority !== "critical"
          )
            return false;
          break;
        }
        case "recurring": {
          if (item.type !== "task" || !item.recurrence) return false;
          break;
        }
      }
    }
    return true;
  });
}

// ── Utilities ──────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}
