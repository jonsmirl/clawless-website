/**
 * Pagelet Web Worker (TypeScript)
 * Executes untrusted entry scripts in an isolated context with a restricted fetch().
 *
 * Message in:  { type: 'run', script, context }
 * Message out: { type: 'result', html }
 *            | { type: 'error', message }
 */

// Intercept fetch before the script can see the real one
const _realFetch = (self as unknown as { fetch: typeof fetch }).fetch.bind(self)

interface RunContext {
  _fetchAllowlist?: string[]
  [key: string]: unknown
}

function makeSandboxedFetch(allowlist: string[]): typeof fetch {
  return function sandboxedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url: URL
    try {
      url = new URL(typeof input === 'string' ? input : (input as Request).url)
    } catch {
      return Promise.reject(new Error('FetchBlockedError: invalid URL'))
    }

    const hostname = url.hostname
    const allowed = allowlist.some((pattern: string) => {
      // Exact match or subdomain match (*.domain.com)
      if (pattern.startsWith('*.')) {
        const base = pattern.slice(2)
        return hostname === base || hostname.endsWith('.' + base)
      }
      return hostname === pattern
    })

    if (!allowed) {
      return Promise.reject(
        new Error(`FetchBlockedError: domain "${hostname}" is not in this entry's fetch_allowlist`),
      )
    }

    return _realFetch(input, init)
  } as typeof fetch
}

self.onmessage = async function (e: MessageEvent) {
  if (e.data?.type !== 'run') return

  const { script, context } = e.data as { script: string; context: RunContext }

  // Build a sandboxed fetch restricted to the entry's allowlist
  const allowlist = context._fetchAllowlist || []
  const sandboxedFetch = makeSandboxedFetch(allowlist)

  // Remove internal fields from context before passing to script
  const { _fetchAllowlist, ...cleanContext } = context

  try {
    const fn = new Function('context', 'fetch', `
      "use strict";
      return (async function() {
        ${script}
      })();
    `)

    const result = await fn(cleanContext, sandboxedFetch)

    self.postMessage({ type: 'result', html: String(result ?? '') })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'error', message })
  }
}
