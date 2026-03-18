/**
 * Personalization composable — geolocation, locale, and user preferences.
 * All data stays on-device (IndexedDB cache + browser APIs).
 */

interface LocationData {
  lat: number
  lng: number
  city?: string
  zip?: string
  expires_at: number
}

interface LocaleData {
  language: string
  timezone: string
  currency: string
  units: 'metric' | 'imperial'
}

export function usePersonalization() {
  const { getPreference, setPreference } = useAuth()

  // ─── Locale (synchronous from browser) ───────────────────────────────────

  function getLocale(): LocaleData {
    const language = navigator.language || 'en-US'
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    // Derive currency from locale
    let currency = 'USD'
    try {
      const parts = new Intl.NumberFormat(language, { style: 'currency', currency: 'USD' })
        .resolvedOptions()
      currency = parts.currency || 'USD'
    } catch {}

    // Derive units from locale (US, Myanmar, Liberia use imperial)
    const imperialLocales = ['en-US', 'en-MM', 'en-LR', 'my', 'lr']
    const units: 'metric' | 'imperial' = imperialLocales.some(l => language.startsWith((l.split('-')[0] ?? '')) && language === l)
      ? 'imperial'
      : language === 'en-US' ? 'imperial' : 'metric'

    return { language, timezone, currency, units }
  }

  // ─── Geolocation ──────────────────────────────────────────────────────────

  async function getCachedLocation(): Promise<LocationData | null> {
    const cached = await getPreference<LocationData>('location_cache')
    if (!cached) return null
    if (Date.now() > cached.expires_at) return null
    return cached
  }

  async function requestLocation(): Promise<LocationData | null> {
    if (!navigator.geolocation) return null

    // Check cache first (1 hour TTL)
    const cached = await getCachedLocation()
    if (cached) return cached

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc: LocationData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            expires_at: Date.now() + 60 * 60 * 1000, // 1 hour
          }

          // Try reverse geocode via a free endpoint
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`,
            )
            if (resp.ok) {
              const data = await resp.json()
              loc.city = data.address?.city || data.address?.town || data.address?.village
              loc.zip = data.address?.postcode
            }
          } catch {}

          await setPreference('location_cache', loc)
          resolve(loc)
        },
        () => resolve(null),
        { timeout: 10000, maximumAge: 60000 },
      )
    })
  }

  // ─── Units preference (overrides locale default) ──────────────────────────

  async function getUnits(): Promise<'metric' | 'imperial'> {
    const pref = await getPreference<'metric' | 'imperial'>('units')
    if (pref) return pref
    return getLocale().units
  }

  async function setUnits(units: 'metric' | 'imperial') {
    await setPreference('units', units)
  }

  // ─── Build full pagelet context ───────────────────────────────────────────

  interface WalletData {
    address: string
    private_key: string
    balance_usdc: number
    spend_cap_usdc: number
  }

  async function buildContext(
    query: string,
    params: Record<string, unknown>,
    requiredPermissions: string[],
    tokens: Record<string, string>,
    fetchAllowlist: string[],
  ) {
    let location = null
    if (requiredPermissions.includes('geolocation')) {
      location = await requestLocation()
    }

    const locale = getLocale()
    const units = await getUnits()
    const wallet = await getPreference<WalletData>('wallet')

    return {
      query,
      params,
      location: location ? { lat: location.lat, lng: location.lng, city: location.city, zip: location.zip } : null,
      locale: { ...locale, units },
      tokens,
      device: {
        online: navigator.onLine,
        platform: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      },
      wallet: wallet ? { address: wallet.address, balance_usdc: wallet.balance_usdc, spend_cap_usdc: wallet.spend_cap_usdc } : null,
      _fetchAllowlist: fetchAllowlist,
      _wallet: wallet, // internal — includes signing key for x402
    }
  }

  return {
    getLocale,
    requestLocation,
    getCachedLocation,
    getUnits,
    setUnits,
    buildContext,
  }
}
