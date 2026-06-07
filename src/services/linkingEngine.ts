// ─────────────────────────────────────────────
// Smart Todo — Semantic Linking Engine
// Auto-generates and manages semantic links between items
// ─────────────────────────────────────────────

import type { Item, SemanticLink, Task } from "../types/item";
import { isTask, isNote } from "../types/item";
import { generateEmbedding, embeddingToBuffer } from "./embeddings";
import { cosineSimilarity } from "./importanceScorer";
import * as db from "../services/database";
import { useSettingsStore } from "../store/settingsStore";

// ── Types ──────────────────────────────────

export interface LinkSuggestion {
  fromItem: Item;
  toItem: Item;
  similarity: number;
}

export interface LinkingResult {
  autoLinked: SemanticLink[];
  suggestions: LinkSuggestion[];
}

// ── Public API ─────────────────────────────

/**
 * Process an item after creation or edit:
 * 1. Generate/update its embedding
 * 2. Compute similarity against all other items
 * 3. Create auto-links above threshold
 * 4. Return suggestions for the suggest-threshold range
 */
export async function processItemLinks(
  item: Item,
  allItems: Item[]
): Promise<LinkingResult> {
  const settings = useSettingsStore.getState();
  const autoThreshold = settings.autoLinkThreshold;    // default 0.7
  const suggestThreshold = settings.suggestLinkThreshold; // default 0.5

  // 1. Generate embedding for the item
  const textToEmbed = buildEmbeddingText(item);
  const { vector } = await generateEmbedding(textToEmbed);

  // Update the item's embedding in DB
  if (vector.some((v) => v !== 0)) {
    const buffer = embeddingToBuffer(vector);
    await updateItemEmbedding(item.id, buffer);
    item.embedding = vector;
  }

  // 2. Compare against all other items
  const autoLinked: SemanticLink[] = [];
  const suggestions: LinkSuggestion[] = [];
  const existingLinks = await db.fetchLinksForItem(item.id);
  const existingLinkSet = new Set(
    existingLinks.map((l) =>
      l.fromId === item.id ? l.toId : l.fromId
    )
  );

  for (const other of allItems) {
    if (other.id === item.id) continue;
    if (other.archivedAt !== null) continue;
    if (existingLinkSet.has(other.id)) continue; // already linked

    // Need embedding for the other item
    if (!other.embedding || other.embedding.length === 0) {
      // Try to generate one
      const otherText = buildEmbeddingText(other);
      const otherResult = await generateEmbedding(otherText);
      if (otherResult.vector.some((v) => v !== 0)) {
        other.embedding = otherResult.vector;
        const otherBuffer = embeddingToBuffer(otherResult.vector);
        await updateItemEmbedding(other.id, otherBuffer);
      } else {
        continue; // can't compare without embeddings
      }
    }

    const similarity = cosineSimilarity(vector, other.embedding!);

    if (similarity >= autoThreshold) {
      // Auto-generate link
      const link = await createLink(item.id, other.id, similarity, true);
      if (link) autoLinked.push(link);

      // Also create reverse link for bidirectional discovery
      await createLink(other.id, item.id, similarity, true);
    } else if (similarity >= suggestThreshold) {
      // Suggest link (not auto-created)
      suggestions.push({
        fromItem: item,
        toItem: other,
        similarity,
      });
    }
  }

  return { autoLinked, suggestions };
}

/**
 * Batch re-link all items.
 * Useful after enabling embeddings for the first time, or on app update.
 * Processes items in batches to avoid blocking the UI.
 */
export async function batchRelinkAll(
  allItems: Item[],
  onProgress?: (processed: number, total: number) => void
): Promise<LinkingResult> {
  const settings = useSettingsStore.getState();
  const autoThreshold = settings.autoLinkThreshold;
  const suggestThreshold = settings.suggestLinkThreshold;

  const allAutoLinked: SemanticLink[] = [];
  const allSuggestions: LinkSuggestion[] = [];
  const activeItems = allItems.filter((i) => i.archivedAt === null);

  // First pass: ensure all items have embeddings
  for (let i = 0; i < activeItems.length; i++) {
    const item = activeItems[i];
    if (!item.embedding || item.embedding.length === 0) {
      const text = buildEmbeddingText(item);
      const { vector } = await generateEmbedding(text);
      if (vector.some((v) => v !== 0)) {
        item.embedding = vector;
        const buffer = embeddingToBuffer(vector);
        await updateItemEmbedding(item.id, buffer);
      }
    }
    onProgress?.(i + 1, activeItems.length);
  }

  // Second pass: compute all pairwise similarities
  // Skip pairs that already have links
  const existingLinks = new Set<string>();

  for (let i = 0; i < activeItems.length; i++) {
    for (let j = i + 1; j < activeItems.length; j++) {
      const itemA = activeItems[i];
      const itemB = activeItems[j];

      if (!itemA.embedding || !itemB.embedding) continue;

      const linkKey = `${itemA.id}:${itemB.id}`;
      if (existingLinks.has(linkKey)) continue;

      const similarity = cosineSimilarity(
        itemA.embedding,
        itemB.embedding
      );

      if (similarity >= autoThreshold) {
        const linkAB = await createLink(
          itemA.id,
          itemB.id,
          similarity,
          true
        );
        const linkBA = await createLink(
          itemB.id,
          itemA.id,
          similarity,
          true
        );
        if (linkAB) allAutoLinked.push(linkAB);
        if (linkBA) allAutoLinked.push(linkBA);
        existingLinks.add(linkKey);
        existingLinks.add(`${itemB.id}:${itemA.id}`);
      } else if (similarity >= suggestThreshold) {
        allSuggestions.push({
          fromItem: itemA,
          toItem: itemB,
          similarity,
        });
      }
    }
  }

  return { autoLinked: allAutoLinked, suggestions: allSuggestions };
}

/**
 * Manually create a user-confirmed link between two items.
 */
export async function confirmLink(
  fromId: string,
  toId: string,
  similarity: number
): Promise<SemanticLink | null> {
  return createLink(fromId, toId, similarity, false);
}

/**
 * Remove a link between two items.
 */
export async function removeLink(linkId: string): Promise<void> {
  const database = db.getDatabase();
  await database.runAsync("DELETE FROM semantic_links WHERE id = ?", [linkId]);
}

/**
 * Get all links for display, resolved with item details.
 */
export async function getResolvedLinks(
  itemId: string,
  allItems: Item[]
): Promise<{ linked: Item; similarity: number; auto: boolean }[]> {
  const links = await db.fetchLinksForItem(itemId);
  const itemMap = new Map(allItems.map((i) => [i.id, i]));

  return links
    .map((link) => {
      const linkedId = link.fromId === itemId ? link.toId : link.fromId;
      const linkedItem = itemMap.get(linkedId);
      if (!linkedItem) return null;
      return {
        linked: linkedItem,
        similarity: link.similarity,
        auto: link.autoGenerated,
      };
    })
    .filter(Boolean) as { linked: Item; similarity: number; auto: boolean }[];
}

// ── Internal helpers ───────────────────────

/**
 * Build the text that gets embedded for an item.
 * Includes title, content, and tags for richer semantic representation.
 */
function buildEmbeddingText(item: Item): string {
  const parts = [item.title];
  if (item.content) parts.push(item.content);
  if (item.tags.length > 0) parts.push(item.tags.join(" "));
  if (isTask(item)) {
    parts.push(`priority: ${item.userPriority}`);
    parts.push(`status: ${item.status}`);
  }
  return parts.join(" \n ");
}

/**
 * Create a semantic link in the database.
 */
async function createLink(
  fromId: string,
  toId: string,
  similarity: number,
  autoGenerated: boolean
): Promise<SemanticLink | null> {
  try {
    const now = new Date().toISOString();
    const link: SemanticLink = {
      id: `${fromId}-${toId}`,
      fromId,
      toId,
      similarity,
      autoGenerated,
      createdAt: now,
    };
    await db.insertSemanticLink(link);
    return link;
  } catch (err) {
    // Likely a UNIQUE constraint violation (link already exists)
    console.warn("[linkingEngine] Could not create link:", err);
    return null;
  }
}

/**
 * Update an item's embedding BLOB in the database.
 */
async function updateItemEmbedding(
  itemId: string,
  buffer: ArrayBuffer
): Promise<void> {
  const database = db.getDatabase();
  await database.runAsync(
    "UPDATE items SET embedding = ?, updated_at = datetime('now') WHERE id = ?",
    [buffer, itemId]
  );
}
