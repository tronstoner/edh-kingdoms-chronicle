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
const SCRATCH_TITLE = 'EDH Kingdoms Chronicle — Export Scratch'

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
async function createScratchSheet(token) {
  const created = await api('https://sheets.googleapis.com/v4/spreadsheets', token, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: SCRATCH_TITLE },
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

// Append rows (array of string[]) to the given tab of the scratch sheet,
// creating the sheet on first use. Returns the sheet url + count.
export async function exportToScratchSheet(tab, rows) {
  if (!rows.length) return { appended: 0, url: scratchUrl(localStorage.getItem(SCRATCH_ID_KEY) || '') }
  const token = await requestWriteToken()
  let id = localStorage.getItem(SCRATCH_ID_KEY) || ''
  if (!id) {
    id = await createScratchSheet(token)
    localStorage.setItem(SCRATCH_ID_KEY, id)
  }
  try {
    await appendToTab(token, id, tab, rows)
  } catch (e) {
    // Scratch sheet was deleted / trashed — recreate once and retry.
    if (e.status === 404) {
      id = await createScratchSheet(token)
      localStorage.setItem(SCRATCH_ID_KEY, id)
      await appendToTab(token, id, tab, rows)
    } else {
      throw e
    }
  }
  return { appended: rows.length, url: scratchUrl(id) }
}
