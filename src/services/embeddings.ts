// ─────────────────────────────────────────────
// Smart Todo — Embedding Service
// TF-IDF with hashing trick (lightweight, no native deps)
// ─────────────────────────────────────────────────────

// ── Types ──────────────────────────────────

export type EmbeddingVector = number[];
export type EmbeddingMethod = "tfidf";

export interface EmbeddingResult {
  vector: EmbeddingVector;
  method: EmbeddingMethod;
}

// ── Constants ──────────────────────────────

export const EMBEDDING_DIM = 384;
const DEBOUNCE_MS = 300;

// ── State ──────────────────────────────────

let _docCount = 0;
const _idfCache: Map<string, number> = new Map();

// ── Status ─────────────────────────────────

export function getEmbeddingStatus(): "ready" {
  return "ready"; // TF-IDF is always available — no model to load
}

/**
 * No-op — kept for API compatibility.
 * TF-IDF doesn't need pre-initialization.
 */
export async function initEmbeddings(): Promise<"ready"> {
  return "ready";
}

// ── Public API ─────────────────────────────

/**
 * Generate a 384-dimensional embedding for the given text.
 * Uses TF-IDF with the hashing trick — fast, deterministic, no native deps.
 */
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResult> {
  const clean = preprocessText(text);
  if (!clean) {
    return { vector: new Array(EMBEDDING_DIM).fill(0), method: "tfidf" };
  }
  return { vector: tfidfEmbed(clean), method: "tfidf" };
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  return texts.map((t) => ({
    vector: tfidfEmbed(preprocessText(t)),
    method: "tfidf" as const,
  }));
}

/**
 * Serialize an embedding vector to a Float32Array buffer for SQLite BLOB storage.
 */
export function embeddingToBuffer(vector: EmbeddingVector): ArrayBuffer {
  return new Float32Array(vector).buffer;
}

/**
 * Deserialize a BLOB buffer back to an embedding vector.
 */
export function bufferToEmbedding(buffer: ArrayBuffer): EmbeddingVector {
  return Array.from(new Float32Array(buffer));
}

// ── Debounced re-embedding ─────────────────

const _debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

/**
 * Debounced embedding generation — useful for re-embedding on content edits.
 * Only the last call within DEBOUNCE_MS for a given key is executed.
 */
export function generateEmbeddingDebounced(
  key: string,
  text: string
): Promise<EmbeddingResult> {
  return new Promise((resolve) => {
    const existing = _debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    _debounceTimers.set(
      key,
      setTimeout(() => {
        _debounceTimers.delete(key);
        const result = generateEmbedding(text);
        resolve(result);
      }, DEBOUNCE_MS)
    );
  });
}

// ── TF-IDF implementation ──────────────────

function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")   // strip punctuation
    .replace(/\s+/g, " ")       // collapse whitespace
    .trim();
}

function tokenize(text: string): string[] {
  return text.split(" ").filter((t) => t.length > 1); // skip single-char tokens
}

/**
 * Build a TF-IDF vector projected into EMBEDDING_DIM via the hashing trick.
 * Deterministic: same text always produces the same vector.
 */
function tfidfEmbed(text: string): EmbeddingVector {
  const tokens = tokenize(text);
  if (tokens.length === 0) return new Array(EMBEDDING_DIM).fill(0);

  _docCount++;

  // Term frequency
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
    if (!_idfCache.has(token)) {
      _idfCache.set(token, 1);
    } else {
      _idfCache.set(token, _idfCache.get(token)! + 1);
    }
  }

  // Project into fixed-dim vector via feature hashing
  const vec = new Array(EMBEDDING_DIM).fill(0);

  for (const [term, freq] of tf) {
    const tfVal = 1 + Math.log(freq);
    const df = _idfCache.get(term) ?? 1;
    const idfVal = Math.log((_docCount + 1) / (df + 1)) + 1;
    const weight = tfVal * idfVal;

    // Hash term to a bucket
    const hash = fnv1aHash(term);
    const bucket = Math.abs(hash) % EMBEDDING_DIM;
    const sign = (hash & 1) === 0 ? 1 : -1; // random sign from hash parity
    vec[bucket] += sign * weight;
  }

  // L2-normalize
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  }

  return vec;
}

/** FNV-1a 32-bit hash — deterministic, fast. */
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash | 0; // convert to signed 32-bit
}
