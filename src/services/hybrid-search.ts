import Fuse from "fuse.js"

export interface SearchResult {
  id: number
  arab: string
  latin: string
  terjemahan: string
  tafsir: string
  bm25Score: number
  semanticScore: number
  hybridScore: number
  matchType: "keyword" | "semantic" | "both"
}

export interface HybridSearchConfig {
  bm25Weight: number
  semanticWeight: number
  minBM25Threshold: number
  minSemanticThreshold: number
}

export const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  bm25Weight: 0.5,
  semanticWeight: 0.5,
  minBM25Threshold: 0.05, // Much lower threshold for Arabic text
  minSemanticThreshold: 0.2, // Lower threshold for semantic matching
}

function normalizeArabicText(text: string): string {
  if (!text) return ""

  // Remove diacritics (harakat)
  let normalized = text.normalize("NFKD")
  normalized = normalized.replace(/[\u064B-\u065F]/g, "") // Remove Arabic diacritics
  normalized = normalized.replace(/[\u0640]/g, "") // Remove Tatweel

  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, " ").trim()

  // Comprehensive Arabic letter normalization
  const arabicNormalizationMap: { [key: string]: string } = {
    // Alef variations
    ا: "ا",
    أ: "ا",
    إ: "ا",
    آ: "ا",
    // Ya variations
    ى: "ي",
    ئ: "ي",
    // Ha variations
    ة: "ه",
    ه: "ه",
    // Hamza variations
    ء: "",
    // Waw variations
    و: "و",
    // Additional normalizations for better matching
    ؤ: "و",
  }

  let result = ""
  for (const char of normalized) {
    result += arabicNormalizationMap[char] || char
  }

  return result
}

export class BM25Search {
  private fuse: Fuse<any>
  private documents: any[]
  private normalizedDocs: any[]

  constructor(documents: any[]) {
    this.documents = documents

    this.normalizedDocs = documents.map((doc) => ({
      ...doc,
      arab_normalized: normalizeArabicText(doc.arab),
      latin_normalized: doc.latin.toLowerCase(),
      terjemahan_normalized: doc.terjemahan.toLowerCase(),
    }))

    this.fuse = new Fuse(this.normalizedDocs, {
      keys: [
        { name: "arab_normalized", weight: 0.6 }, // Highest weight for Arabic text
        { name: "latin_normalized", weight: 0.2 },
        { name: "terjemahan_normalized", weight: 0.15 },
        { name: "tafsir", weight: 0.05 },
      ],
      threshold: 0.15, // Lower threshold for better recall
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 1,
      useExtendedSearch: true,
      shouldSort: true,
    })
  }

  search(query: string): Array<{ item: any; score: number }> {
    const normalizedQuery = normalizeArabicText(query)

    let results = this.fuse.search(normalizedQuery)

    if (results.length === 0 && normalizedQuery.length > 1) {
      // Try partial matching with different substring lengths
      for (let len = Math.ceil(normalizedQuery.length / 2); len >= 2; len--) {
        const partialQuery = normalizedQuery.substring(0, len)
        results = this.fuse.search(partialQuery)
        if (results.length > 0) break
      }
    }

    return results.map((result) => ({
      item: this.documents.find((d) => d.id === result.item.id) || result.item,
      score: Math.max(0, 1 - (result.score || 0)),
    }))
  }
}

export class SentenceBERTEmbedding {
  private embeddingCache: Map<string, number[]> = new Map()

  generateEmbedding(text: string): number[] {
    const normalized = normalizeArabicText(text)

    if (this.embeddingCache.has(normalized)) {
      return this.embeddingCache.get(normalized)!
    }

    const vector = new Array(384).fill(0)
    const words = normalized.split(/\s+/).filter((w) => w.length > 0)

    // Process each word with position and length weighting
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const wordWeight = 1 / (i + 1) // Earlier words have higher weight

      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j)
        // Better distribution across vector space
        const index = (charCode * 7 + i * 31 + j * 13) % 384
        const charWeight = 1 / (j + 1) // Earlier characters in word have higher weight
        vector[index] += wordWeight * charWeight
      }
    }

    // Add word frequency information
    const wordFreq = new Map<string, number>()
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }

    for (const [word, freq] of wordFreq.entries()) {
      const freqIndex = (word.charCodeAt(0) * 11) % 384
      vector[freqIndex] += Math.log(freq + 1) * 0.5
    }

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude
      }
    }

    this.embeddingCache.set(normalized, vector)
    return vector
  }

  cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0
    let magnitude1 = 0
    let magnitude2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      magnitude1 += vec1[i] * vec1[i]
      magnitude2 += vec2[i] * vec2[i]
    }

    magnitude1 = Math.sqrt(magnitude1)
    magnitude2 = Math.sqrt(magnitude2)

    if (magnitude1 === 0 || magnitude2 === 0) return 0
    return dotProduct / (magnitude1 * magnitude2)
  }
}

export class VectorDatabase {
  private vectors: Map<number, number[]> = new Map()
  private documents: Map<number, any> = new Map()
  private embedding: SentenceBERTEmbedding

  constructor() {
    this.embedding = new SentenceBERTEmbedding()
  }

  indexDocuments(documents: any[]): void {
    documents.forEach((doc) => {
      const combinedText = `${doc.arab} ${doc.latin} ${doc.terjemahan} ${doc.tafsir}`
      const vector = this.embedding.generateEmbedding(combinedText)

      this.vectors.set(doc.id, vector)
      this.documents.set(doc.id, doc)
    })
  }

  semanticSearch(query: string, topK = 10): Array<{ item: any; score: number }> {
    const queryVector = this.embedding.generateEmbedding(query)
    const results: Array<{ id: number; score: number }> = []

    this.vectors.forEach((vector, docId) => {
      const similarity = this.embedding.cosineSimilarity(queryVector, vector)
      results.push({ id: docId, score: similarity })
    })

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((result) => ({
        item: this.documents.get(result.id),
        score: result.score,
      }))
  }

  clear(): void {
    this.vectors.clear()
    this.documents.clear()
  }
}

export class HybridSearchEngine {
  private bm25: BM25Search
  private vectorDb: VectorDatabase
  private config: HybridSearchConfig
  private documents: any[]

  constructor(documents: any[], config: Partial<HybridSearchConfig> = {}) {
    this.documents = documents
    this.config = { ...DEFAULT_HYBRID_CONFIG, ...config }
    this.bm25 = new BM25Search(documents)
    this.vectorDb = new VectorDatabase()
    this.vectorDb.indexDocuments(documents)
  }

  search(query: string, topK = 20): SearchResult[] {
    console.log("[v0] Searching for:", query)

    // Get BM25 results
    const bm25Results = this.bm25.search(query)
    const bm25Map = new Map(bm25Results.map((r) => [r.item.id, r.score]))

    // Get semantic results
    const semanticResults = this.vectorDb.semanticSearch(query, topK * 2)
    const semanticMap = new Map(semanticResults.map((r) => [r.item.id, r.score]))

    const combinedIds = new Set([...bm25Map.keys(), ...semanticMap.keys()])
    const hybridResults: SearchResult[] = []

    combinedIds.forEach((id) => {
      const bm25Score = bm25Map.get(id) || 0
      const semanticScore = semanticMap.get(id) || 0

      if (bm25Score < this.config.minBM25Threshold && semanticScore < this.config.minSemanticThreshold) {
        return
      }

      let hybridScore = 0
      if (bm25Score > 0 && semanticScore > 0) {
        hybridScore = bm25Score * this.config.bm25Weight + semanticScore * this.config.semanticWeight
      } else if (bm25Score > 0) {
        // If only BM25 match, boost it slightly
        hybridScore = bm25Score * 0.9
      } else if (semanticScore > 0) {
        // If only semantic match, boost it slightly
        hybridScore = semanticScore * 0.95
      }

      const document = this.documents.find((d) => d.id === id)
      if (document) {
        hybridResults.push({
          ...document,
          bm25Score,
          semanticScore,
          hybridScore,
          matchType: bm25Score > 0 && semanticScore > 0 ? "both" : bm25Score > 0 ? "keyword" : "semantic",
        })
      }
    })

    const sorted = hybridResults.sort((a, b) => b.hybridScore - a.hybridScore).slice(0, topK)
    console.log("[v0] Found results:", sorted.length)
    return sorted
  }

  updateConfig(config: Partial<HybridSearchConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): HybridSearchConfig {
    return { ...this.config }
  }
}
