/**
 * Clawless Search Worker
 *
 * Embeds a query via Workers AI (bge-small-en-v1.5, 384 dims)
 * and searches Vectorize for the nearest cached entry.
 *
 * Returns: { match: true, id, query, score, url } or { match: false }
 */

const SIMILARITY_THRESHOLD = 0.85;
const CDN_BASE = "https://s3.lowpan.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://clawless.lowpan.com",
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
        topK: 1,
        returnMetadata: "all",
      });

      if (results.matches && results.matches.length > 0) {
        const best = results.matches[0];

        if (best.score >= SIMILARITY_THRESHOLD) {
          return Response.json(
            {
              match: true,
              id: best.id,
              query: best.metadata?.query || "",
              score: best.score,
              url: `${CDN_BASE}/cache/${best.id}.json`,
            },
            { headers: CORS_HEADERS }
          );
        }
      }

      // No match above threshold
      return Response.json(
        { match: false, bestScore: results.matches?.[0]?.score || 0 },
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
