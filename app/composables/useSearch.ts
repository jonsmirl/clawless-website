/**
 * Semantic search using e5-small-v2 via Transformers.js.
 * Loads embedding model in-browser, fetches binary index from server,
 * and finds best matching cached entry by cosine similarity over Float32Arrays.
 */

interface IndexMeta {
  id: string
  query: string
  follow_ups: string[]
}

interface IndexHeader {
  entries: IndexMeta[]
  dims: number
  count: number
}

interface SearchResult {
  entry: IndexMeta
  score: number
}

const SIMILARITY_THRESHOLD = 0.85

export function useSearch() {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl || 'http://localhost:8787'

  const modelReady = ref(false)
  const modelLoading = ref(false)
  const indexLoaded = ref(false)
  const indexSize = ref(0)

  let pipeline: any = null
  let indexHeader: IndexHeader | null = null
  let indexVectors: Float32Array | null = null
  let indexDims = 0

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
    try {
      console.log('Fetching binary index...')
      const resp = await fetch(`${apiUrl}/index`)
      if (!resp.ok) {
        console.error('Index fetch failed:', resp.status)
        return
      }

      const buffer = await resp.arrayBuffer()
      const view = new DataView(buffer)

      // Read header length (uint32 LE at offset 0)
      const headerLen = view.getUint32(0, true)

      // Read header JSON
      const headerBytes = new Uint8Array(buffer, 4, headerLen)
      const headerJson = new TextDecoder().decode(headerBytes)
      indexHeader = JSON.parse(headerJson) as IndexHeader

      // Read vectors (float32 LE, contiguous, after header)
      const vectorOffset = 4 + headerLen
      const vectorBytes = buffer.byteLength - vectorOffset
      indexVectors = new Float32Array(buffer, vectorOffset, vectorBytes / 4)
      indexDims = indexHeader.dims

      indexLoaded.value = true
      indexSize.value = indexHeader.count
      console.log(`Binary index loaded: ${indexHeader.count} entries, ${indexDims} dims, ${(buffer.byteLength / 1024).toFixed(1)} KB`)
    }
    catch (err) {
      console.error('Failed to load search index:', err)
    }
  }

  async function embedQuery(query: string): Promise<Float32Array | null> {
    if (!pipeline) return null

    try {
      // e5 models expect 'query: ' prefix for search queries
      const output = await pipeline(`query: ${query}`, {
        pooling: 'mean',
        normalize: true,
      })
      return output.data as Float32Array
    }
    catch (err) {
      console.error('Embedding error:', err)
      return null
    }
  }

  function cosineSimilarityF32(a: Float32Array, b: Float32Array, bOffset: number, dims: number): number {
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < dims; i++) {
      const ai = a[i]
      const bi = b[bOffset + i]
      dot += ai * bi
      normA += ai * ai
      normB += bi * bi
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  async function search(query: string): Promise<SearchResult | null> {
    if (!modelReady.value || !indexHeader || !indexVectors) return null

    const queryVec = await embedQuery(query)
    if (!queryVec) return null

    let bestIdx = -1
    let bestScore = -1

    for (let i = 0; i < indexHeader.count; i++) {
      const score = cosineSimilarityF32(queryVec, indexVectors, i * indexDims, indexDims)
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }

    if (bestIdx >= 0 && bestScore >= SIMILARITY_THRESHOLD) {
      return {
        entry: indexHeader.entries[bestIdx],
        score: bestScore,
      }
    }

    console.log(`Best match: "${indexHeader.entries[bestIdx]?.query}" (${bestScore.toFixed(3)}) — below threshold`)
    return null
  }

  // Start loading model and index on client-side only
  if (import.meta.client) {
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
    indexSize: computed(() => indexSize.value),
    search,
    loadIndex,
  }
}
