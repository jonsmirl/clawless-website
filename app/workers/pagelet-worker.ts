/**
 * Pagelet Web Worker (TypeScript)
 * Executes untrusted entry scripts in an isolated context with a restricted fetch().
 * Supports x402 micropayments when a wallet is configured.
 *
 * Message in:  { type: 'run', script, context }
 * Message out: { type: 'result', html }
 *            | { type: 'error', message }
 *            | { type: 'payment', amount: string, recipient: string }
 */

// Intercept fetch before the script can see the real one
const _realFetch = (self as unknown as { fetch: typeof fetch }).fetch.bind(self)

interface WalletData {
  address: string
  private_key: string
  balance_usdc: number
  spend_cap_usdc: number
}

interface RunContext {
  _fetchAllowlist?: string[]
  _wallet?: WalletData | null
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

/**
 * Wrap a sandboxed fetch with x402 payment support.
 * If @x402/fetch is not bundled or wallet is missing, returns the original fetch.
 */
async function wrapWithPayment(
  baseFetch: typeof fetch,
  wallet: WalletData | null | undefined,
): Promise<typeof fetch> {
  if (!wallet?.address || !wallet?.private_key) {
    return baseFetch
  }

  try {
    // Dynamic import — if @x402/fetch is not available, fall back gracefully
    const { wrapFetchWithPayment } = await import('@x402/fetch')

    const paymentFetch = wrapFetchWithPayment(baseFetch, wallet.address, {
      privateKey: wallet.private_key as `0x${string}`,
    })

    // Return a wrapper that tracks payment events
    return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = await paymentFetch(input, init)

      // Check if a payment was made (x402 adds payment headers to successful responses)
      const paymentAmount = response.headers.get('x-payment-amount')
      const paymentRecipient = response.headers.get('x-payment-recipient')

      if (paymentAmount && paymentRecipient) {
        self.postMessage({
          type: 'payment',
          amount: paymentAmount,
          recipient: paymentRecipient,
        })
      }

      return response
    }) as typeof fetch
  } catch {
    // @x402/fetch not available — fall back to plain sandboxed fetch
    return baseFetch
  }
}

self.onmessage = async function (e: MessageEvent) {
  if (e.data?.type !== 'run') return

  const { script, context } = e.data as { script: string; context: RunContext }

  // Build a sandboxed fetch restricted to the entry's allowlist
  const allowlist = context._fetchAllowlist || []
  const sandboxedFetch = makeSandboxedFetch(allowlist)

  // Wrap with x402 payment if wallet is available
  const paymentFetch = await wrapWithPayment(sandboxedFetch, context._wallet)

  // Remove internal fields from context before passing to script
  const { _fetchAllowlist, _wallet, ...cleanContext } = context

  try {
    // Wrap in AsyncFunction — script body is `async function(context) { ... }`
    // We construct it as an IIFE with the payment-enabled fetch injected
    const fn = new Function('context', 'fetch', `
      "use strict";
      return (async function() {
        ${script}
      })();
    `)

    const result = await fn(cleanContext, paymentFetch)

    self.postMessage({ type: 'result', html: String(result ?? '') })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'error', message })
  }
}
