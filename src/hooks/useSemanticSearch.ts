// ─────────────────────────────────────────────
// Smart Todo — useSemanticSearch Hook
// Debounced semantic search with loading/error states
// ─────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import type { Item } from "../types/item";
import {
  searchItems,
  searchItemsKeyword,
  type SearchResult,
  type SearchFilter,
} from "../services/semanticSearch";
import { getEmbeddingStatus, initEmbeddings } from "../services/embeddings";

// ── Types ──────────────────────────────────

export interface UseSearchOptions {
  /** Debounce delay in ms (default: 250) */
  debounceMs?: number;
  /** Maximum number of results to return (default: 20) */
  limit?: number;
  /** Active filters */
  filters?: SearchFilter[];
}

export interface UseSearchReturn {
  /** Current search results */
  results: SearchResult[];
  /** Whether a search is in progress */
  loading: boolean;
  /** Error message, if any */
  error: string | null;
  /** The raw query string */
  query: string;
  /** Update the query (triggers debounced search) */
  setQuery: (q: string) => void;
  /** Clear all results and query */
  clear: () => void;
  /** Whether the embedding model is ready */
  embeddingsReady: boolean;
  /** Force-initialize embeddings (call once at app start) */
  initModel: () => Promise<void>;
  /** Search method used for the last results */
  lastMethod: "hybrid" | "keyword" | null;
}

// ── Hook ───────────────────────────────────

/**
 * Provides debounced semantic search against a list of items.
 *
 * Usage:
 * ```tsx
 * const { results, loading, setQuery, query } = useSemanticSearch(items);
 * <TextInput onChangeText={setQuery} placeholder="Search..." />
 * {results.map(r => <Text key={r.item.id}>{r.item.title}</Text>)}
 * ```
 */
export function useSemanticSearch(
  items: Item[],
  options: UseSearchOptions = {}
): UseSearchReturn {
  const {
    debounceMs = 250,
    limit = 20,
    filters = [],
  } = options;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [embeddingsReady, setEmbeddingsReady] = useState(
    getEmbeddingStatus() === "ready"
  );
  const [lastMethod, setLastMethod] = useState<"hybrid" | "keyword" | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0); // monotonic counter to discard stale results

  // ── Init embeddings ──────────────────────

  const initModel = useCallback(async () => {
    if (getEmbeddingStatus() === "ready") {
      setEmbeddingsReady(true);
      return;
    }
    const status = await initEmbeddings();
    setEmbeddingsReady(status === "ready");
  }, []);

  // ── Run search ───────────────────────────

  const runSearch = useCallback(
    async (q: string, seq: number) => {
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        setError(null);
        setLastMethod(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let searchResults: SearchResult[];

        if (getEmbeddingStatus() === "ready") {
          // Full semantic + keyword hybrid search
          searchResults = await searchItems(q, items, filters);
          setLastMethod("hybrid");
        } else {
          // Keyword-only fast path
          searchResults = searchItemsKeyword(q, items, filters);
          setLastMethod("keyword");
        }

        // Discard stale results
        if (seq !== searchSeqRef.current) return;

        setResults(searchResults.slice(0, limit));
      } catch (err) {
        if (seq !== searchSeqRef.current) return;
        console.error("[useSemanticSearch] Search failed:", err);
        setError("Search failed. Please try again.");
        // Fall back to keyword search
        try {
          const fallback = searchItemsKeyword(q, items, filters);
          if (seq === searchSeqRef.current) {
            setResults(fallback.slice(0, limit));
            setLastMethod("keyword");
          }
        } catch {
          // give up
        }
      } finally {
        if (seq === searchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [items, filters, limit]
  );

  // ── Debounced query effect ───────────────

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const seq = ++searchSeqRef.current;

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      setLastMethod(null);
      return;
    }

    // Show loading immediately for user feedback
    setLoading(true);

    debounceTimerRef.current = setTimeout(() => {
      runSearch(query, seq);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, runSearch]);

  // ── Clear ────────────────────────────────

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setLoading(false);
    setError(null);
    setLastMethod(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  return {
    results,
    loading,
    error,
    query,
    setQuery,
    clear,
    embeddingsReady,
    initModel,
    lastMethod,
  };
}
