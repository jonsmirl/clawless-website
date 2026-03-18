/**
 * Auth store — OAuth tokens in IndexedDB (encrypted with Web Crypto AES-GCM).
 * Tokens never leave the browser.
 */

const DB_NAME = 'clawless-auth'
const DB_VERSION = 1

interface TokenRecord {
  provider: string
  access_token: string
  refresh_token?: string
  expires_at?: number
  scope?: string
  iv: string        // base64 AES-GCM IV
  encrypted: string // base64 encrypted payload
}

interface StoredToken {
  access_token: string
  refresh_token?: string
  expires_at?: number
  scope?: string
}

let _db: IDBDatabase | null = null

async function openDb(): Promise<IDBDatabase> {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('tokens')) {
        db.createObjectStore('tokens', { keyPath: 'provider' })
      }
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences')
      }
    }
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}

// Derive a stable encryption key from a fixed app salt (not device-specific — keeps it simple)
let _cryptoKey: CryptoKey | null = null
async function getCryptoKey(): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey
  const rawKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('clawless-auth-v1-key-2026'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  _cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('clawless-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  return _cryptoKey
}

async function encryptToken(data: StoredToken): Promise<{ iv: string; encrypted: string }> {
  const key = await getCryptoKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return {
    iv: btoa(String.fromCharCode(...iv)),
    encrypted: btoa(String.fromCharCode(...new Uint8Array(buf))),
  }
}

async function decryptToken(iv: string, encrypted: string): Promise<StoredToken> {
  const key = await getCryptoKey()
  const ivBuf = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
  const encBuf = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, encBuf)
  return JSON.parse(new TextDecoder().decode(decrypted))
}

export function useAuth() {
  const connectedProviders = ref<string[]>([])

  async function saveToken(provider: string, tokenData: StoredToken) {
    const db = await openDb()
    const { iv, encrypted } = await encryptToken(tokenData)
    const record: TokenRecord = { provider, access_token: tokenData.access_token, iv, encrypted }
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tokens', 'readwrite')
      tx.objectStore('tokens').put(record)
      tx.oncomplete = () => {
        if (!connectedProviders.value.includes(provider)) {
          connectedProviders.value = [...connectedProviders.value, provider]
        }
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  }

  async function getToken(provider: string): Promise<StoredToken | null> {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tokens', 'readonly')
      const req = tx.objectStore('tokens').get(provider)
      req.onsuccess = async () => {
        const record: TokenRecord | undefined = req.result
        if (!record) return resolve(null)
        try {
          const data = await decryptToken(record.iv, record.encrypted)
          resolve(data)
        } catch {
          resolve(null)
        }
      }
      req.onerror = () => reject(req.error)
    })
  }

  async function removeToken(provider: string) {
    const db = await openDb()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tokens', 'readwrite')
      tx.objectStore('tokens').delete(provider)
      tx.oncomplete = () => {
        connectedProviders.value = connectedProviders.value.filter(p => p !== provider)
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  }

  async function getAllTokens(): Promise<Record<string, string>> {
    const db = await openDb()
    const records: TokenRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction('tokens', 'readonly')
      const req = tx.objectStore('tokens').getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tokens: Record<string, string> = {}
    for (const record of records) {
      try {
        const data = await decryptToken(record.iv, record.encrypted)
        // Check expiry
        if (data.expires_at && Date.now() > data.expires_at) continue
        tokens[record.provider] = data.access_token
      } catch {
        // skip corrupt record
      }
    }
    return tokens
  }

  async function loadConnectedProviders() {
    const db = await openDb()
    const records: TokenRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction('tokens', 'readonly')
      const req = tx.objectStore('tokens').getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    connectedProviders.value = records.map(r => r.provider)
  }

  async function getPreference<T>(key: string): Promise<T | null> {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('preferences', 'readonly')
      const req = tx.objectStore('preferences').get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  }

  async function setPreference(key: string, value: unknown) {
    const db = await openDb()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('preferences', 'readwrite')
      tx.objectStore('preferences').put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // ─── Wallet helpers (stored in preferences) ──────────────────────────────

  interface WalletData {
    address: string
    private_key: string
    balance_usdc: number
    spend_cap_usdc: number
  }

  async function getWallet(): Promise<WalletData | null> {
    return getPreference<WalletData>('wallet')
  }

  async function setWallet(wallet: WalletData): Promise<void> {
    await setPreference('wallet', wallet)
  }

  async function removeWallet(): Promise<void> {
    await setPreference('wallet', null)
  }

  return {
    connectedProviders,
    saveToken,
    getToken,
    removeToken,
    getAllTokens,
    loadConnectedProviders,
    getPreference,
    setPreference,
    getWallet,
    setWallet,
    removeWallet,
  }
}
