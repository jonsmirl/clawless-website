/**
 * Clawless Search Worker
 *
 * Embeds a query via Workers AI (bge-small-en-v1.5, 384 dims)
 * and searches Vectorize for the nearest cached entry.
 *
 * Returns: { match: true, id, query, score, url } or { match: false }
 */

const SIMILARITY_THRESHOLD = 0.82;
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
      // Embed the query via Workers AI
      const embeddingResponse = await env.AI.run(
        "@cf/baai/bge-base-en-v1.5",
        { text: [query.trim()] }
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

      if (results.matches && results.matches.length > 0) {
        const best = results.matches[0];

        if (best.score >= SIMILARITY_THRESHOLD) {
          const hasArticle = best.metadata?.has_article === true;
          return Response.json(
            {
              match: true,
              has_article: hasArticle,
              id: best.id,
              query: best.metadata?.query || "",
              score: best.score,
              url: hasArticle ? `${CDN_BASE}/cache/${best.id}.json` : null,
            },
            { headers: CORS_HEADERS }
          );
        }
      }

      // No match above threshold — return top candidates for debugging
      const candidates = (results.matches || []).map(m => ({
        query: m.metadata?.query || "",
        score: m.score,
      }));
      return Response.json(
        { match: false, bestScore: candidates[0]?.score || 0, candidates },
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
