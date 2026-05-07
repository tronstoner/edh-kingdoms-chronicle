#!/usr/bin/env node
//
// Regenerates everything in public/ that's derived from artwork in resources/.
// Run via: npm run assets
//
// Inputs (resources/) are full-size RGBA PNGs.
// Outputs (public/) are: full-size copies + sized variants for icons + flattened
// app-icon variants (alpha composited onto the dark theme color so iOS doesn't
// show transparent areas as pure black).
//
// macOS-only: relies on /usr/bin/sips for resize/pad.

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const BG_HEX = '1a1612' // matches --color-mtg-dark in src/style.css

const SOURCES = {
  king_bg:   'resources/ZombieGoblinKing.png',          // splash background, RGBA cutout
  king_icon: 'resources/ZombieGoblinKing_AppIcon.png',  // app icon, RGB with framed art
  crown:     'resources/Crown.png',
  parchment: 'resources/Parchment.png',
  potion:    'resources/Potion.png',
}

const ROLES = ['King', 'Knight', 'Goblin', 'Zombie Lord', 'Clone Lord']
const slug = (s) => s.toLowerCase().replace(/ +/g, '-')

// op:
//   'copy'             — full-size copy preserving alpha
//   'resize'           — sips resize, preserves alpha
//   'flatten-resize'   — composite onto BG_HEX → resize
//   'flatten-pad'      — composite onto BG_HEX → pad to padFactor × size with BG → resize
const OUTPUTS = [
  // Full-size canonical copies (kept so the splash and other UI can reference them)
  { from: 'king_bg',   to: 'public/zombie-goblin-king.png', op: 'copy' },
  { from: 'crown',     to: 'public/crown.png',              op: 'copy' },
  { from: 'parchment', to: 'public/parchment.png',          op: 'copy' },
  { from: 'potion',    to: 'public/potion.png',             op: 'copy' },

  // Header crown (small, alpha preserved)
  { from: 'crown',     to: 'public/crown-128.png',          op: 'resize',      size: 128 },

  // App icons: AppIcon source already has its framed dark background, so just resize
  { from: 'king_icon', to: 'public/favicon.png',            op: 'resize',      size: 32  },
  { from: 'king_icon', to: 'public/icon-180.png',           op: 'resize',      size: 180 },
  { from: 'king_icon', to: 'public/apple-touch-icon.png',   op: 'resize',      size: 180 },
  { from: 'king_icon', to: 'public/icon-192.png',           op: 'resize',      size: 192 },
  { from: 'king_icon', to: 'public/icon-512.png',           op: 'resize',      size: 512 },

  // Maskable: pad with the theme dark so Android's circle/squircle mask doesn't crop the gold frame
  { from: 'king_icon', to: 'public/icon-maskable-512.png',  op: 'flatten-pad', size: 512, padFactor: 1.36 },
]

// Role assets (alpha preserved). 600px portraits for the role-picker showcase, 128px badges for inline icons.
for (const role of ROLES) {
  OUTPUTS.push({ src: `resources/Roles/${role}.png`,     to: `public/roles/${slug(role)}.png`,      op: 'resize', size: 600 })
  OUTPUTS.push({ src: `resources/RoleIcons/${role}.png`, to: `public/role-icons/${slug(role)}.png`, op: 'resize', size: 128 })
}

// ---------- PNG composite (alpha → solid bg) ----------

function flattenAlphaToBg(srcPath, bgHex) {
  const bgR = parseInt(bgHex.slice(0, 2), 16)
  const bgG = parseInt(bgHex.slice(2, 4), 16)
  const bgB = parseInt(bgHex.slice(4, 6), 16)

  const buf = fs.readFileSync(srcPath)
  let off = 8, idat = [], ihdr
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.slice(off + 4, off + 8).toString()
    if (type === 'IHDR') ihdr = buf.slice(off + 8, off + 8 + len)
    if (type === 'IDAT') idat.push(buf.slice(off + 8, off + 8 + len))
    off += 8 + len + 4
  }
  const w = ihdr.readUInt32BE(0)
  const h = ihdr.readUInt32BE(4)
  const colorType = ihdr[9]
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : null
  if (bpp === null) throw new Error(`${srcPath}: unsupported color type ${colorType}`)
  const stride = w * bpp

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const pixels = Buffer.alloc(h * stride)
  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  let rOff = 0, pOff = 0
  for (let y = 0; y < h; y++) {
    const filter = raw[rOff++]
    for (let x = 0; x < stride; x++) {
      const rb = raw[rOff++]
      const a = x >= bpp ? pixels[pOff + x - bpp] : 0
      const b = y > 0 ? pixels[pOff + x - stride] : 0
      const c = y > 0 && x >= bpp ? pixels[pOff + x - stride - bpp] : 0
      let v
      if (filter === 0) v = rb
      else if (filter === 1) v = (rb + a) & 0xff
      else if (filter === 2) v = (rb + b) & 0xff
      else if (filter === 3) v = (rb + ((a + b) >>> 1)) & 0xff
      else if (filter === 4) v = (rb + paeth(a, b, c)) & 0xff
      else throw new Error(`unknown PNG filter ${filter}`)
      pixels[pOff + x] = v
    }
    pOff += stride
  }

  const out = Buffer.alloc(w * h * 3)
  for (let i = 0, j = 0; j < out.length; i += bpp, j += 3) {
    const sr = pixels[i], sg = pixels[i + 1], sb = pixels[i + 2]
    const sa = bpp === 4 ? pixels[i + 3] : 255
    const a = sa / 255
    out[j]     = Math.round(sr * a + bgR * (1 - a))
    out[j + 1] = Math.round(sg * a + bgG * (1 - a))
    out[j + 2] = Math.round(sb * a + bgB * (1 - a))
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrOut = Buffer.alloc(13)
  ihdrOut.writeUInt32BE(w, 0)
  ihdrOut.writeUInt32BE(h, 4)
  ihdrOut[8] = 8
  ihdrOut[9] = 2 // RGB
  const rows = Buffer.alloc(h * (w * 3 + 1))
  for (let y = 0; y < h; y++) {
    rows[y * (w * 3 + 1)] = 0
    out.copy(rows, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  }
  const idatOut = zlib.deflateSync(rows)
  const chunk = (type, data) => {
    const c = Buffer.alloc(4 + 4 + data.length + 4)
    c.writeUInt32BE(data.length, 0)
    c.write(type, 4, 4, 'ascii')
    data.copy(c, 8)
    c.writeUInt32BE(zlib.crc32(c.slice(4, 8 + data.length)), 8 + data.length)
    return c
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrOut),
    chunk('IDAT', idatOut),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- sips wrappers ----------

function sipsResize(inPath, outPath, size) {
  execFileSync('/usr/bin/sips', ['-z', String(size), String(size), inPath, '--out', outPath], { stdio: 'pipe' })
}

function sipsPad(inPath, outPath, size, hex) {
  execFileSync('/usr/bin/sips', [
    '--padToHeightWidth', String(size), String(size),
    '--padColor', hex,
    inPath, '--out', outPath,
  ], { stdio: 'pipe' })
}

// ---------- runner ----------

function abs(p) { return path.join(ROOT, p) }

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
}

function processOne(entry) {
  const srcRel = entry.from ? SOURCES[entry.from] : entry.src
  const src = abs(srcRel)
  const dst = abs(entry.to)
  if (!fs.existsSync(src)) throw new Error(`missing source: ${srcRel}`)
  ensureDir(dst)

  if (entry.op === 'copy') {
    fs.copyFileSync(src, dst)
    return
  }

  if (entry.op === 'resize') {
    sipsResize(src, dst, entry.size)
    return
  }

  if (entry.op === 'flatten-resize') {
    const tag = (entry.from || path.basename(entry.to, '.png')).replace(/[^a-z0-9_-]/gi, '_')
    const tmp = path.join(require('os').tmpdir(), `flat-${tag}-${process.pid}.png`)
    fs.writeFileSync(tmp, flattenAlphaToBg(src, BG_HEX))
    sipsResize(tmp, dst, entry.size)
    fs.unlinkSync(tmp)
    return
  }

  if (entry.op === 'flatten-pad') {
    // Flatten → pad to padFactor × srcSize → resize down to target.
    const tag = (entry.from || path.basename(entry.to, '.png')).replace(/[^a-z0-9_-]/gi, '_')
    const tmpFlat = path.join(require('os').tmpdir(), `flat-${tag}-${process.pid}.png`)
    const tmpPadded = path.join(require('os').tmpdir(), `padded-${tag}-${process.pid}.png`)
    fs.writeFileSync(tmpFlat, flattenAlphaToBg(src, BG_HEX))
    // Determine source width to compute the padded canvas
    const buf = fs.readFileSync(tmpFlat)
    const srcW = buf.readUInt32BE(16)
    const padTo = Math.round(srcW * entry.padFactor)
    sipsPad(tmpFlat, tmpPadded, padTo, BG_HEX.toUpperCase())
    sipsResize(tmpPadded, dst, entry.size)
    fs.unlinkSync(tmpFlat)
    fs.unlinkSync(tmpPadded)
    return
  }

  throw new Error(`unknown op: ${entry.op}`)
}

let failed = 0
for (const entry of OUTPUTS) {
  try {
    processOne(entry)
    console.log(`✓ ${entry.to}`)
  } catch (e) {
    failed++
    console.error(`✗ ${entry.to}: ${e.message}`)
  }
}
if (failed) {
  console.error(`\n${failed} output(s) failed.`)
  process.exit(1)
}
console.log(`\nRegenerated ${OUTPUTS.length} file(s).`)
