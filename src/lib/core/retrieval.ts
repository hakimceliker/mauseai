/**
 * Retrieval for RAG (diagram card CORE — "RAG").
 * Okapi BM25 over prepared chunks; deterministic and dependency-free so the
 * same ranking runs in tests, in the API and inside Inngest steps.
 */

export interface RetrievableChunk {
  id: string;
  documentId: string;
  content: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievedChunk extends RetrievableChunk {
  score: number;
  citation: number;
}

const STOPWORDS = new Set([
  "ve", "veya", "ile", "bir", "bu", "şu", "da", "de", "mi", "mı", "mu", "mü", "için", "gibi", "ne", "nasıl",
  "the", "a", "an", "and", "or", "of", "to", "in", "is", "are", "for", "on", "with", "what", "how",
]);

export function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function rankChunks(
  query: string,
  chunks: RetrievableChunk[],
  options: { tenantId: string; topK?: number; minScore?: number; k1?: number; b?: number },
): RetrievedChunk[] {
  const { tenantId, topK = 5, minScore = 0.01, k1 = 1.2, b = 0.75 } = options;
  // Tenant boundary is enforced here as well as in RLS: foreign chunks never rank.
  const corpus = chunks.filter((c) => c.tenantId === tenantId);
  const terms = [...new Set(tokenize(query))];
  if (!terms.length || !corpus.length) return [];

  const docs = corpus.map((c) => tokenize(c.content));
  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / docs.length || 1;
  const documentFrequency = new Map<string, number>();
  for (const term of terms) documentFrequency.set(term, docs.filter((d) => d.includes(term)).length);

  const scored = corpus.map((chunk, i) => {
    const doc = docs[i];
    let score = 0;
    for (const term of terms) {
      const tf = doc.filter((t) => t === term).length;
      if (!tf) continue;
      const df = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (corpus.length - df + 0.5) / (df + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / avgLength)));
    }
    return { ...chunk, score };
  });

  return scored
    .filter((c) => c.score >= minScore)
    .sort((a, b2) => b2.score - a.score || a.id.localeCompare(b2.id))
    .slice(0, topK)
    .map((c, i) => ({ ...c, citation: i + 1 }));
}
