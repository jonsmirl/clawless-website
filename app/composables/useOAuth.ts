/**
 * OAuth implicit-flow popup helper.
 * Opens a popup, waits for the callback postMessage, saves the token.
 */

type Provider = 'google' | 'github' | 'microsoft'

const PROVIDER_CONFIG: Record<Provider, {
  label: string
  scopes: string
  authUrl: string
  clientIdKey: string
}> = {
  google: {
    label: 'Google',
    scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdKey: 'googleClientId',
  },
  github: {
    label: 'GitHub',
    scopes: 'read:user repo',
    authUrl: 'https://github.com/login/oauth/authorize',
    clientIdKey: 'githubClientId',
  },
  microsoft: {
    label: 'Microsoft',
    scopes: 'User.Read Calendars.Read',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientIdKey: 'microsoftClientId',
  },
}

export function useOAuth() {
  const config = useRuntimeConfig()
  const { saveToken } = useAuth()

  /**
   * Open the OAuth popup for a provider and wait for the token.
   * Returns the access_token string, or null if the user cancelled.
   */
  async function connectProvider(provider: Provider): Promise<string | null> {
    const cfg = PROVIDER_CONFIG[provider]
    const clientId = (config.public as Record<string, string>)[cfg.clientIdKey]

    if (!clientId) {
      console.warn(`OAuth: no client ID configured for ${provider}`)
      return null
    }

    const redirectUri = `${window.location.origin}/oauth/callback`
    const state = btoa(JSON.stringify({ provider, nonce: crypto.randomUUID() }))
    sessionStorage.setItem('oauth_state', state)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: cfg.scopes,
      response_type: 'token',
      state,
    })

    const width = 500, height = 650
    const left = Math.round((screen.width - width) / 2)
    const top = Math.round((screen.height - height) / 2)

    const popup = window.open(
      `${cfg.authUrl}?${params}`,
      `oauth_${provider}`,
      `width=${width},height=${height},left=${left},top=${top}`,
    )

    if (!popup) {
      console.warn('OAuth: popup blocked')
      return null
    }

    return new Promise<string | null>((resolve) => {
      const handler = async (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return
        if (e.data?.type !== 'oauth_callback') return

        window.removeEventListener('message', handler)
        clearInterval(closedPoll)
        popup.close()

        if (e.data.error || !e.data.access_token) {
          console.error('OAuth error:', e.data.error)
          return resolve(null)
        }

        // CSRF check
        if (e.data.state !== sessionStorage.getItem('oauth_state')) {
          console.error('OAuth state mismatch')
          return resolve(null)
        }
        sessionStorage.removeItem('oauth_state')

        await saveToken(provider, {
          access_token: e.data.access_token,
          expires_at: e.data.expires_in
            ? Date.now() + Number(e.data.expires_in) * 1000
            : undefined,
        })

        resolve(e.data.access_token)
      }

      window.addEventListener('message', handler)

      // If user closes popup without completing
      const closedPoll = setInterval(() => {
        if (popup.closed) {
          clearInterval(closedPoll)
          window.removeEventListener('message', handler)
          resolve(null)
        }
      }, 500)
    })
  }

  return { connectProvider, PROVIDER_CONFIG }
}
