declare module '@x402/fetch' {
  export function wrapFetchWithPayment(
    baseFetch: typeof fetch,
    address: string,
    options: { privateKey: `0x${string}` }
  ): typeof fetch
}

declare module '@x402/core' {
  export interface PaymentRequirement {
    scheme: string
    network: string
    maxAmountRequired: string
    resource: string
    description: string
    mimeType: string
    payTo: string
    maxTimeoutSeconds: number
    asset: string
    extra: Record<string, unknown>
  }
}

declare module '@x402/evm' {
  export function createPaymentHeader(
    requirement: import('@x402/core').PaymentRequirement,
    privateKey: `0x${string}`
  ): Promise<string>
}
