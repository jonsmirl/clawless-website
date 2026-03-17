/**
 * Semantic search via Cloudflare Workers (edge-side embedding + Vectorize).
 * No browser-side model needed — search happens at Cloudflare's edge.
 */

interface SearchResult {
  match: boolean
  id?: string
  query?: string
  score?: number
  url?: string
  bestScore?: number
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

      if (result.match) {
        console.log(`Search hit: "${result.query}" (score: ${result.score?.toFixed(3)})`)
      }
      else {
        console.log(`Search miss (best: ${result.bestScore?.toFixed(3) || 'none'})`)
      }

      return result.match ? result : null
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
    indexSize: ref(0), // TODO: get from Worker health endpoint
    search,
    loadIndex: () => {},
  }
}
