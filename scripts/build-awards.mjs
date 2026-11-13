// Turns src/content/apdovanojimai.txt (the achievements list as the studio writes it, copied from
// the old megusta.lt page) into src/content/apdovanojimai.json, which the /apie-studija/apdovanojimai
// page and its crawler copy read. Run after editing the text:  node scripts/build-awards.mjs
//
// Text format, one item per line:
//   2026 METAI                                   starts a year
//   ŠOK 2026 (Kaunas)                            a competition; the city in brackets is optional
//   Hip Hop Formation Adults I vieta | V-Team    a result: category, place, then who
//   Hip Hop Duo Mini Kids – Ona ir Ema I vt.     also accepted: category – who place
//   Grand Prix | V-Team                          an award without a place (Grand Prix, a cup, ...)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'src/content/apdovanojimai.txt')
const OUT = join(root, 'src/content/apdovanojimai.json')

const ROMAN = { I: 1, V: 5, X: 10, L: 50 }
function roman(s) {
  let n = 0
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]], next = ROMAN[s[i + 1]] ?? 0
    n += v < next ? -v : v
  }
  return n
}

// "II vieta", "II Vieta", "II vt.", "II v.", "24 vieta"
const RANK = /(?:^|\s)([IVXL]+|\d{1,3})\s+(?:vieta|Vieta|vt|v)(?=[\s.,|]|$)[.,]?/
// group names that start the "who" part when a line has no separator (2025 style)
const WHO_STARTS = ['Me Gusta', 'Megustukai', 'Monsters', 'Juniors Beginners', 'Andrius', 'Rugilė', 'Dagnė', 'Matas']
const GRAND_PRIX = /grand prix|pagrindinis apdovanojimas/i
const CATEGORY_WORD = /^(hip|free|street|pop)/i

const tidy = s => s.replace(/\s+/g, ' ').replace(/^[\s|–-]+|[\s|–-]+$/g, '').trim()

function splitWho(left) {
  const dash = left.lastIndexOf(' – ')
  if (dash > 0) return [left.slice(0, dash), left.slice(dash + 3)]
  let at = -1
  for (const w of WHO_STARTS) {
    const i = left.lastIndexOf(w)
    if (i > 0 && (at < 0 || i < at)) at = i
  }
  return at > 0 ? [left.slice(0, at), left.slice(at)] : [left, '']
}

/** A result line, or null when the line is a competition heading. */
function parseResult(line) {
  const m = RANK.exec(line)
  if (m) {
    const r = /^\d+$/.test(m[1]) ? Number(m[1]) : roman(m[1])
    const left = line.slice(0, m.index)
    const right = tidy(line.slice(m.index + m[0].length))
    const [t, w] = right ? [left, right] : splitWho(left)
    return { r, t: tidy(t), w: tidy(w) }
  }
  if (/–.*GRAND PRIX$/.test(line)) {
    const [t, w] = splitWho(line.replace(/\s*GRAND PRIX$/, ''))
    return { r: 'GP', t: tidy(t), w: tidy(w) }
  }
  const bar = line.indexOf('|')
  if (bar > 0 && !line.trim().endsWith(')')) {
    const t = tidy(line.slice(0, bar)), w = tidy(line.slice(bar + 1))
    // GP: Grand Prix; A: another award (a cup, best choreography); null: a category without a place
    const r = GRAND_PRIX.test(t) ? 'GP' : CATEGORY_WORD.test(t) ? null : 'A'
    return { r, t, w }
  }
  return null
}

const titleCase = s => s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s,])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s

function parseEvent(line) {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(line)
  const name = tidy((m ? m[1] : line).replace(/^Šokių festivalis/i, 'Šokių Festivalis'))
  return { name, city: m ? titleCase(tidy(m[2])) : '', results: [] }
}

const years = []
let year = null, event = null
const problems = []
readFileSync(SRC, 'utf8').split(/\r?\n/).forEach((raw, i) => {
  const line = raw.trim()
  if (!line) return
  const y = /^(\d{4}) METAI$/.exec(line)
  if (y) { year = { year: Number(y[1]), events: [] }; years.push(year); event = null; return }
  if (!year) { problems.push(`${i + 1}: before any year: ${line}`); return }
  const res = parseResult(line)
  if (res) {
    if (!event) { problems.push(`${i + 1}: result before any competition: ${line}`); return }
    if (!res.w) problems.push(`${i + 1}: no dancer or team found: ${line}`)
    event.results.push(res)
  } else {
    event = parseEvent(line)
    year.events.push(event)
  }
})

for (const y of years) for (const e of y.events) if (!e.results.length) problems.push(`${y.year} ${e.name}: no results`)

writeFileSync(OUT, JSON.stringify(years) + '\n')
const total = years.reduce((n, y) => n + y.events.reduce((m, e) => m + e.results.length, 0), 0)
console.log(`${years.length} years, ${years.reduce((n, y) => n + y.events.length, 0)} competitions, ${total} results → ${OUT.slice(root.length + 1)}`)
if (problems.length) console.log('Check:\n  ' + problems.join('\n  '))
