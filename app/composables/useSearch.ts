/**
 * Semantic search via Cloudflare Workers (edge-side embedding + Vectorize).
 * No browser-side model needed — search happens at Cloudflare's edge.
 *
 * Two-threshold system:
 *   ≥ 0.82  → Strong match (serve from cache)
 *   0.35–0.82 → Recognizable (allow /miss)
 *   < 0.35  → Gibberish (reject at edge)
 */

interface SearchResult {
  match: boolean
  has_article?: boolean
  id?: string
  query?: string
  score?: number
  url?: string
  bestScore?: number
  rejected?: boolean
  recognizable?: boolean
  nearest_query?: string
  reason?: string
  candidates?: Array<{ query: string; score: number }>
}

export function useSearch() {
  const config = useRuntimeConfig()
  const searchUrl = config.public.searchUrl || 'https://clawless-search.lowpan.workers.dev'

  const ready = ref(true) // Always ready — no model to load

  async function search(query: string): Promise<SearchResult | null> {
    try {
      const resp = await fetch(
        `${searchUrl}?q=${encodeURIComponent(query.trim())}`,
      )

      if (!resp.ok) {
        console.error('Search worker error:', resp.status)
        return null
      }

      const result: SearchResult = await resp.json()

      if (result.rejected) {
        console.log(`Search rejected as gibberish (best: ${result.bestScore?.toFixed(3) || 'none'})`)
        return result
      }

      if (result.match) {
        console.log(`Search hit: "${result.query}" (score: ${result.score?.toFixed(3)})`)
        return result
      }

      if (result.recognizable) {
        console.log(`Search recognizable: "${result.nearest_query}" (score: ${result.bestScore?.toFixed(3)})`)
      }
      else {
        console.log(`Search miss (best: ${result.bestScore?.toFixed(3) || 'none'})`)
      }

      return result
    }
    catch (err) {
      console.error('Search failed:', err)
      return null
    }
  }

  return {
    modelReady: ready,
    modelLoading: ref(false),
    indexLoaded: ready,
    indexSize: ref(0),
    search,
    loadIndex: () => {},
  }
}
