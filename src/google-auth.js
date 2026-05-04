const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly'
const TOKEN_KEY = 'edh_google_token'
const TOKEN_EXPIRY_KEY = 'edh_google_token_expiry'

let tokenClient = null
let accessToken = null
let resolveAuth = null

function saveToken(token, expiresInSec) {
  accessToken = token
  const expiry = Date.now() + (expiresInSec - 60) * 1000 // refresh 1 min early
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry))
}

function loadSavedToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const expiry = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || 0)
  if (token && Date.now() < expiry) {
    accessToken = token
    return true
  }
  clearSavedToken()
  return false
}

function clearSavedToken() {
  accessToken = null
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY)
}

export function getAccessToken() {
  return accessToken
}

export function isSignedIn() {
  return !!accessToken
}

function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = resolve
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

export async function initGoogleAuth() {
  if (!CLIENT_ID) {
    throw new Error('Set VITE_GOOGLE_CLIENT_ID in .env')
  }

  // Try to restore a saved token before loading GIS
  const restored = loadSavedToken()

  await loadGisScript()

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error) {
        resolveAuth?.({ error: response.error })
        return
      }
      saveToken(response.access_token, response.expires_in || 3600)
      resolveAuth?.({ token: accessToken })
    },
  })

  return restored
}

export function signIn() {
  return new Promise((resolve) => {
    resolveAuth = resolve
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

export function signOut() {
  if (accessToken) {
    window.google.accounts.oauth2.revoke(accessToken)
  }
  clearSavedToken()
}
