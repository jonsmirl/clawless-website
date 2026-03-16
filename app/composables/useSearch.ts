/**
 * Semantic search using e5-small-v2 via Transformers.js.
 * Loads the embedding model in-browser, fetches the index from the server,
 * and finds the best matching cached entry by cosine similarity.
 */

interface IndexEntry {
  id: string
  query: string
  embedding: number[]
  follow_ups: string[]
}

interface SearchResult {
  entry: IndexEntry
  score: number
}

const SIMILARITY_THRESHOLD = 0.85

export function useSearch() {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl || 'http://localhost:8787'

  const modelReady = ref(false)
  const modelLoading = ref(false)
  const index = ref<IndexEntry[]>([])
  const indexLoaded = ref(false)

  let pipeline: any = null

  async function loadModel() {
    if (pipeline || modelLoading.value) return
    modelLoading.value = true

    try {
      console.log('Loading embedding model (e5-small-v2)...')
      const { pipeline: createPipeline } = await import('@huggingface/transformers')
      console.log('Transformers.js imported, creating pipeline...')
      pipeline = await createPipeline('feature-extraction', 'intfloat/e5-small-v2', {
        dtype: 'q8',
        device: 'wasm',
      })
      modelReady.value = true
      console.log('Embedding model loaded (e5-small-v2, q8, wasm)')
    }
    catch (err) {
      console.error('Failed to load embedding model:', err)
    }
    finally {
      modelLoading.value = false
    }
  }

  async function loadIndex() {
    if (indexLoaded.value) return

    try {
      const resp = await fetch(`${apiUrl}/index`)
      if (resp.ok) {
        index.value = await resp.json()
        indexLoaded.value = true
        console.log(`Search index loaded: ${index.value.length} entries`)
      }
    }
    catch (err) {
      console.error('Failed to load search index:', err)
    }
  }

  async function embedQuery(query: string): Promise<number[] | null> {
    if (!pipeline) return null

    try {
      // e5 models expect 'query: ' prefix for search queries
      const output = await pipeline(`query: ${query}`, {
        pooling: 'mean',
        normalize: true,
      })
      // output.data is a Float32Array
      return Array.from(output.data as Float32Array)
    }
    catch (err) {
      console.error('Embedding error:', err)
      return null
    }
  }

  function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  async function search(query: string): Promise<SearchResult | null> {
    if (!modelReady.value || index.value.length === 0) return null

    const queryEmbedding = await embedQuery(query)
    if (!queryEmbedding) return null

    let bestMatch: IndexEntry | null = null
    let bestScore = -1

    for (const entry of index.value) {
      const score = cosineSimilarity(queryEmbedding, entry.embedding)
      if (score > bestScore) {
        bestScore = score
        bestMatch = entry
      }
    }

    if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
      return { entry: bestMatch, score: bestScore }
    }

    return null
  }

  // Start loading model and index on client-side only
  if (import.meta.client) {
    // Use onMounted to ensure we're in the browser
    onMounted(() => {
      console.log('useSearch: initializing on client')
      loadModel()
      loadIndex()
    })
  }

  return {
    modelReady,
    modelLoading,
    indexLoaded,
    indexSize: computed(() => index.value.length),
    search,
    loadIndex,
  }
}
