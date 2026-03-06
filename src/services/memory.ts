import AsyncStorage from '@react-native-async-storage/async-storage';
import { MemoryEntry, MemorySearchResult } from '../types';

const MEMORY_KEY = '@openclaw:memories';

/**
 * Persistent vector memory system.
 * Uses TF-IDF-like keyword scoring for local similarity search
 * (no external embedding API needed).
 */
export class MemoryService {
  private memories: MemoryEntry[] = [];
  private maxEntries: number;
  private loaded = false;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(MEMORY_KEY);
      this.memories = raw ? JSON.parse(raw) : [];
      this.loaded = true;
    } catch {
      this.memories = [];
      this.loaded = true;
    }
  }

  private async persist(): Promise<void> {
    await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(this.memories));
  }

  async addMemory(
    content: string,
    tags: string[],
    source: MemoryEntry['source'],
    importance = 0.5,
    conversationId?: string
  ): Promise<MemoryEntry> {
    await this.load();

    const entry: MemoryEntry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content,
      tags,
      source,
      conversationId,
      timestamp: Date.now(),
      importance,
      embedding: this.computeLocalEmbedding(content),
    };

    this.memories.push(entry);

    // Evict least important old entries if over limit
    if (this.memories.length > this.maxEntries) {
      this.memories.sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp);
      this.memories = this.memories.slice(0, this.maxEntries);
    }

    await this.persist();
    return entry;
  }

  async search(query: string, limit = 10, minScore = 0.1): Promise<MemorySearchResult[]> {
    await this.load();
    if (this.memories.length === 0) return [];

    const queryEmbedding = this.computeLocalEmbedding(query);
    const queryTokens = this.tokenize(query.toLowerCase());

    const scored: MemorySearchResult[] = this.memories.map(entry => {
      // Cosine similarity between embeddings
      const cosineSim = this.cosineSimilarity(queryEmbedding, entry.embedding || []);

      // Keyword overlap bonus
      const entryTokens = this.tokenize(entry.content.toLowerCase());
      const overlap = queryTokens.filter(t => entryTokens.includes(t)).length;
      const keywordScore = queryTokens.length > 0 ? overlap / queryTokens.length : 0;

      // Tag match bonus
      const queryLower = query.toLowerCase();
      const tagBonus = entry.tags.some(t => queryLower.includes(t.toLowerCase())) ? 0.15 : 0;

      // Recency bonus (newer memories get slight boost)
      const ageHours = (Date.now() - entry.timestamp) / (1000 * 60 * 60);
      const recencyBonus = Math.max(0, 0.05 * (1 - ageHours / (24 * 30))); // decays over 30 days

      const score = (cosineSim * 0.4) + (keywordScore * 0.35) + tagBonus + recencyBonus + (entry.importance * 0.1);
      return { entry, score };
    });

    return scored
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async searchByTags(tags: string[], limit = 20): Promise<MemoryEntry[]> {
    await this.load();
    const lowerTags = tags.map(t => t.toLowerCase());
    return this.memories
      .filter(m => m.tags.some(t => lowerTags.includes(t.toLowerCase())))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async deleteMemory(id: string): Promise<void> {
    await this.load();
    this.memories = this.memories.filter(m => m.id !== id);
    await this.persist();
  }

  async getAllMemories(): Promise<MemoryEntry[]> {
    await this.load();
    return [...this.memories].sort((a, b) => b.timestamp - a.timestamp);
  }

  async getMemoryCount(): Promise<number> {
    await this.load();
    return this.memories.length;
  }

  async clearAll(): Promise<void> {
    this.memories = [];
    await this.persist();
  }

  /**
   * Auto-extract memorable content from a conversation turn.
   * Returns content worth memorizing, or null if nothing notable.
   */
  extractMemorableContent(userMessage: string, assistantResponse: string): {
    content: string;
    tags: string[];
    importance: number;
  } | null {
    const combined = `${userMessage} ${assistantResponse}`.toLowerCase();

    // Patterns that indicate memorable content
    const memoryPatterns = [
      { pattern: /my name is (\w+)/i, tag: 'identity', importance: 0.9 },
      { pattern: /i (prefer|like|love|hate|dislike)\b/i, tag: 'preference', importance: 0.7 },
      { pattern: /i (work|live|study)\b/i, tag: 'personal', importance: 0.8 },
      { pattern: /remember (that|this|:)/i, tag: 'explicit-memory', importance: 0.95 },
      { pattern: /my (email|phone|address|birthday)\b/i, tag: 'contact', importance: 0.85 },
      { pattern: /i always|i never|i usually/i, tag: 'habit', importance: 0.7 },
      { pattern: /important|don't forget|note that/i, tag: 'important', importance: 0.8 },
      { pattern: /my (project|app|website|company|team)\b/i, tag: 'work', importance: 0.75 },
    ];

    for (const { pattern, tag, importance } of memoryPatterns) {
      if (pattern.test(combined)) {
        // Extract the relevant sentence
        const sentences = userMessage.split(/[.!?\n]+/).filter(s => s.trim());
        const relevantSentence = sentences.find(s => pattern.test(s)) || userMessage;
        return {
          content: relevantSentence.trim().slice(0, 500),
          tags: [tag, 'auto-extracted'],
          importance,
        };
      }
    }

    return null;
  }

  /**
   * Build context string from relevant memories to inject into system prompt.
   */
  async buildMemoryContext(query: string): Promise<string> {
    const results = await this.search(query, 5, 0.15);
    if (results.length === 0) return '';

    const memoryLines = results.map(r => {
      const age = this.formatAge(r.entry.timestamp);
      return `- [${age}] ${r.entry.content} (tags: ${r.entry.tags.join(', ')})`;
    });

    return `\n## Relevant Memories\n${memoryLines.join('\n')}\n`;
  }

  // --- Local embedding (bag-of-words TF vector) ---

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOP_WORDS.has(t));
  }

  private computeLocalEmbedding(text: string): number[] {
    const tokens = this.tokenize(text);
    const freq: Record<string, number> = {};
    for (const t of tokens) {
      freq[t] = (freq[t] || 0) + 1;
    }

    // Create a simple hash-based fixed-size vector (128 dimensions)
    const vec = new Array(128).fill(0);
    for (const [word, count] of Object.entries(freq)) {
      const hash = this.hashString(word);
      const idx = Math.abs(hash) % 128;
      vec[idx] += count * (hash > 0 ? 1 : -1);
    }

    // Normalize
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (mag > 0) {
      for (let i = 0; i < vec.length; i++) vec[i] /= mag;
    }
    return vec;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
  }

  private formatAge(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
  'was', 'one', 'our', 'out', 'has', 'his', 'how', 'its', 'may', 'who', 'did',
  'get', 'got', 'let', 'say', 'she', 'too', 'use', 'that', 'this', 'with',
  'have', 'from', 'they', 'been', 'said', 'each', 'will', 'what', 'when',
  'make', 'like', 'just', 'than', 'them', 'some', 'into', 'could', 'would',
  'there', 'their', 'about', 'which', 'other', 'these', 'then', 'also', 'more',
]);

let memoryInstance: MemoryService | null = null;

export function getMemoryService(maxEntries = 1000): MemoryService {
  if (!memoryInstance) {
    memoryInstance = new MemoryService(maxEntries);
  }
  return memoryInstance;
}
