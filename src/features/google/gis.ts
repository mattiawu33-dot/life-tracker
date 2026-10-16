/**
 * Google Identity Services (the official "Sign in with Google" library),
 * loaded on demand. We use its token flow: a Google popup asks for permission
 * and hands back an access token that works for about an hour.
 */

interface TokenResponse {
  access_token?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void
}

interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string
    scope: string
    callback: (r: TokenResponse) => void
    error_callback?: (e: { type?: string; message?: string }) => void
  }): TokenClient
  revoke(token: string, done?: () => void): void
  hasGrantedAllScopes(r: TokenResponse, ...scopes: string[]): boolean
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } }
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
let loading: Promise<GoogleOAuth2> | null = null

export function loadGis(): Promise<GoogleOAuth2> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2)
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_URL
    s.async = true
    s.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google.accounts.oauth2) : reject(new Error('Google sign-in failed to load.')))
    s.onerror = () => {
      loading = null
      reject(new Error("Couldn't load Google sign-in. Check your internet connection."))
    }
    document.head.appendChild(s)
  })
  return loading
}

export interface GoogleToken {
  accessToken: string
  expiresAt: number
}

/**
 * Opens Google's popup. Must be called from a click (browsers block popups otherwise).
 * prompt '' = quick re-approval if you've said yes before; 'consent' = always ask.
 */
export async function requestToken(clientId: string, scopes: string, prompt: '' | 'consent'): Promise<GoogleToken> {
  const oauth2 = await loadGis()
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error_description || r.error || 'Google sign-in was cancelled.'))
        if (!oauth2.hasGrantedAllScopes(r, ...scopes.split(' '))) {
          return reject(new Error('Please allow access to your calendars (tick both boxes on the Google screen).'))
        }
        resolve({ accessToken: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 })
      },
      error_callback: (e) =>
        reject(new Error(e.type === 'popup_closed' ? 'The Google window was closed before finishing.' : e.message || 'Google sign-in failed.')),
    })
    client.requestAccessToken({ prompt })
  })
}

export async function revokeToken(token: string): Promise<void> {
  try {
    const oauth2 = await loadGis()
    await new Promise<void>((r) => oauth2.revoke(token, r))
  } catch {
    // Best effort: the token expires within the hour anyway.
  }
}
