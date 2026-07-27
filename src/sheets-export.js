// Direct "park to a Google Sheet" export for the lifetracker.
//
// Copy-pasting the export TSV is unusable on iPad, so instead we append the
// session's rows to a scratch spreadsheet the user can open on a desktop
// later and paste into the real source-of-truth sheet.
//
// Safety: this uses the `drive.file` scope, which grants access ONLY to
// files this app itself creates. It structurally cannot see or modify the
// source-of-truth sheet (VITE_SHEET_ID) — so a bad append can never corrupt
// real data. The scope is requested lazily, on the first export click, so
// normal sign-in stays read-only.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const SCRATCH_ID_KEY = 'edhlog-export-scratch-id'
// Manual override for the device label appended to the scratch title. Set it
// (e.g. from the console: localStorage.setItem('edhlog-export-device-label',
// "Ralf's iPad")) when the auto-derived label isn't specific enough.
const DEVICE_LABEL_KEY = 'edhlog-export-device-label'
const SCRATCH_TITLE = 'EDH Kingdoms Chronicle — Export Scratch'

// Best-effort device label so each device's scratch sheet is distinguishable
// in Drive (and so a lookup finds the right one). Browsers can't read the real
// device name, so we derive a coarse platform label from the user agent; a
// manual override in localStorage wins if set.
function deviceLabel() {
  const override = (localStorage.getItem(DEVICE_LABEL_KEY) || '').trim()
  if (override) return override
  const ua = navigator.userAgent || ''
  const touch = navigator.maxTouchPoints || 0
  // iPadOS 13+ reports a desktop "Macintosh" UA; a touch-capable Mac is an iPad.
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1)) return 'iPad'
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown device'
}

function scratchTitle() {
  return `${SCRATCH_TITLE} (${deviceLabel()})`
}

// The scratch sheet's tabs and their column order. This module owns the
// structure; ExportModal builds row arrays to match these headers.
const TABS = ['Kingdoms', 'The Cycle']
const HEADERS = {
  'Kingdoms': ['Date', 'Player', 'Deck', 'Role', 'Result', 'Role Notes', '1st KO', 'End', 'Game Notes'],
  'The Cycle': ['Date', 'Seat', 'Player', 'Deck', 'Colors', 'House', 'Turn Order', 'Result', 'KO Turn', 'Notes', '1st KO', 'End', 'Game Notes'],
}

let tokenClient = null
let writeToken = null
let writeTokenExpiry = 0

// Request (or reuse) an access token carrying the drive.file scope. GIS
// shows the consent screen the first time the scope is granted, then stays
// silent on subsequent requests. This token is separate from the app's
// read-only sign-in token — the two never mix.
function requestWriteToken() {
  return new Promise((resolve, reject) => {
    if (writeToken && Date.now() < writeTokenExpiry) {
      resolve(writeToken)
      return
    }
    if (!CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID is not set.'))
      return
    }
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google sign-in has not loaded yet.'))
      return
    }
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: () => {},
      })
    }
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error))
        return
      }
      writeToken = response.access_token
      writeTokenExpiry = Date.now() + ((response.expires_in || 3600) - 60) * 1000
      resolve(writeToken)
    }
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

async function api(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`${res.status} ${text}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// Create the scratch spreadsheet with both tabs and their header rows.
async function createScratchSheet(token, title) {
  const created = await api('https://sheets.googleapis.com/v4/spreadsheets', token, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: TABS.map(t => ({ properties: { title: t } })),
    }),
  })
  const id = created.spreadsheetId
  for (const tab of TABS) {
    await api(
      `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(`${tab}!A1`)}?valueInputOption=USER_ENTERED`,
      token,
      { method: 'PUT', body: JSON.stringify({ values: [HEADERS[tab]] }) },
    )
  }
  return id
}

async function appendToTab(token, id, tab, rows) {
  const range = encodeURIComponent(`${tab}!A1`)
  await api(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}:append`
      + '?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    token,
    { method: 'POST', body: JSON.stringify({ values: rows }) },
  )
}

function scratchUrl(id) {
  return `https://docs.google.com/spreadsheets/d/${id}/edit`
}

// Find a scratch spreadsheet this app previously created with the given title.
// The drive.file scope makes files.list return only app-created files, so this
// recovers this device's sheet after localStorage is wiped (e.g. Safari's
// 7-day script-storage cap) instead of spawning a duplicate. Returns the
// newest matching id, or '' if none.
async function findScratchSheet(token, title) {
  const q = [
    `name = '${title.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
    'trashed = false',
    "'me' in owners",
  ].join(' and ')
  const url = 'https://www.googleapis.com/drive/v3/files'
    + `?q=${encodeURIComponent(q)}`
    + '&fields=files(id)'
    + '&orderBy=modifiedTime desc'
    + '&pageSize=1'
  const res = await api(url, token)
  return res.files?.[0]?.id || ''
}

// Resolve this device's scratch-sheet id: Drive lookup first, create only if
// none exists. Caches the result in localStorage as a fast path.
async function resolveScratchId(token) {
  const title = scratchTitle()
  let id = await findScratchSheet(token, title)
  if (!id) id = await createScratchSheet(token, title)
  localStorage.setItem(SCRATCH_ID_KEY, id)
  return id
}

// Append rows (array of string[]) to the given tab of the scratch sheet,
// resolving (looking up or creating) the sheet on first use. Returns the
// sheet url + count.
export async function exportToScratchSheet(tab, rows) {
  if (!rows.length) return { appended: 0, url: scratchUrl(localStorage.getItem(SCRATCH_ID_KEY) || '') }
  const token = await requestWriteToken()
  let id = localStorage.getItem(SCRATCH_ID_KEY) || ''
  if (!id) id = await resolveScratchId(token)
  try {
    await appendToTab(token, id, tab, rows)
  } catch (e) {
    // Cached sheet was deleted / trashed or the cache is stale — re-resolve
    // (Drive lookup, else recreate) once and retry.
    if (e.status === 404) {
      id = await resolveScratchId(token)
      await appendToTab(token, id, tab, rows)
    } else {
      throw e
    }
  }
  return { appended: rows.length, url: scratchUrl(id) }
}
