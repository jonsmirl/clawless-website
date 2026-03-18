/**
 * Clawless Search Worker
 *
 * Embeds a query via Workers AI (bge-base-en-v1.5, 768 dims)
 * and searches Vectorize for the nearest cached entry.
 *
 * Two-threshold system against 13M dense index (ORCAS + Wikipedia):
 *   ≥ 0.82  → Strong match: serve from cache
 *   0.35–0.82 → Recognizable: allow /miss (generate on demand)
 *   < 0.35  → Gibberish: reject at edge (no server cost)
 */

const SIMILARITY_THRESHOLD = 0.82;
const GIBBERISH_THRESHOLD = 0.35;
const CDN_BASE = "https://s3.lowpan.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return Response.json(
        { error: "Missing ?q= parameter" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    try {
      // Embed the query via Workers AI (routed through AI Gateway for caching + rate limiting)
      const embeddingResponse = await env.AI.run(
        "@cf/baai/bge-base-en-v1.5",
        { text: [query.trim()] },
        { gateway: { id: "default" } }
      );

      const queryVector = embeddingResponse.data[0];

      if (!queryVector || queryVector.length === 0) {
        return Response.json(
          { error: "Embedding failed" },
          { status: 500, headers: CORS_HEADERS }
        );
      }

      // Search Vectorize for nearest match
      const results = await env.VECTORIZE.query(queryVector, {
        topK: 3,
        returnMetadata: "all",
      });

      const best = results.matches?.[0];
      const bestScore = best?.score || 0;

      // Gibberish: nothing in 13M entries is similar
      if (bestScore < GIBBERISH_THRESHOLD) {
        const candidates = (results.matches || []).map(m => ({
          query: m.metadata?.query || "",
          score: m.score,
        }));
        return Response.json(
          {
            match: false,
            rejected: true,
            reason: "gibberish",
            bestScore,
            candidates,
          },
          { headers: CORS_HEADERS }
        );
      }

      // Strong match: serve from cache
      if (bestScore >= SIMILARITY_THRESHOLD) {
        const hasArticle = best.metadata?.has_article === true;
        return Response.json(
          {
            match: true,
            has_article: hasArticle,
            id: best.id,
            query: best.metadata?.query || "",
            score: bestScore,
            url: hasArticle ? `${CDN_BASE}/cache/${best.id}.json` : null,
          },
          { headers: CORS_HEADERS }
        );
      }

      // Recognizable (0.35–0.82): known in index but no strong cache hit
      // Allow /miss to generate on demand
      const candidates = (results.matches || []).map(m => ({
        query: m.metadata?.query || "",
        score: m.score,
      }));
      return Response.json(
        {
          match: false,
          recognizable: true,
          nearest_query: best.metadata?.query || "",
          bestScore,
          candidates,
        },
        { headers: CORS_HEADERS }
      );
    }
    catch (err) {
      console.error("Search error:", err);
      return Response.json(
        { error: "Search failed", detail: err.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }
  },
};
