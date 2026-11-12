// "Pagrindinė paieškos frazė": the phrase is never sent to Google (the meta keywords tag is ignored by
// Google Search). It only drives this checklist: is the phrase in the places Google actually reads?
// Lithuanian words change their endings ("registracija", "registracijos", "registruokis"), so words are
// compared by their beginning, not letter for letter, and short linking words are skipped.

const STOP_WORDS = new Set(['į', 'ir', 'su', 'ar', 'bei', 'iš', 'per', 'už', 'prie', 'nuo', 'iki', 'po', 'be', 'apie', 'kaip', 'kur', 'tai', 'yra', 'the', 'and'])

function words(text: string): string[] {
  return text.toLocaleLowerCase('lt').normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

/** The start of a word that stays the same across its forms: šokių/šokiai → "šoki", registracija/registruokis → "registr". */
function stem(word: string): string {
  return word.length <= 4 ? word : word.slice(0, Math.max(4, Math.ceil(word.length * 0.55)))
}

export function phraseStems(phrase: string): string[] {
  return words(phrase).filter(w => !STOP_WORDS.has(w)).map(stem)
}

/** Every meaningful word of the phrase appears in the text (in any form). */
export function containsPhrase(text: string, stems: string[]): boolean {
  if (stems.length === 0) return false
  const tokens = words(text)
  return stems.every(s => tokens.some(t => t.startsWith(s)))
}

export type FocusCheck = { label: string; text: string; tip: string }

export function FocusPhraseCheck({ phrase, checks }: { phrase: string; checks: FocusCheck[] }) {
  const trimmed = phrase.trim()
  if (!trimmed) {
    return (
      <div className="adm-field" style={{ marginTop: 20 }}>
        <span className="adm-label">Frazės patikra</span>
        <p className="adm-help">Įrašykite pagrindinę paieškos frazę, ir čia matysite, ar ji yra ten, kur Google ją skaito.</p>
      </div>
    )
  }
  const stems = phraseStems(trimmed)
  const several = /[,;]/.test(trimmed)
  return (
    <div className="adm-field" style={{ marginTop: 20 }}>
      <span className="adm-label">Frazės patikra: „{trimmed}“</span>
      {several && <p className="adm-error">Įrašykite vieną frazę be kablelių: vienas puslapis turi atsakyti į vieną paieškos klausimą.</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 6 }}>
        {checks.map(c => {
          const ok = containsPhrase(c.text, stems)
          return (
            <li key={c.label} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 14 }}>
              <span aria-hidden="true" style={{ color: ok ? 'var(--adm-ok, #1a9c5b)' : 'var(--adm-warn, #c77700)', fontWeight: 700 }}>{ok ? '✓' : '!'}</span>
              <span>
                <b>{c.label}</b>: {ok ? 'frazė yra.' : <>frazės nėra. <span className="adm-help" style={{ display: 'inline' }}>{c.tip}</span></>}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="adm-help" style={{ marginTop: 8 }}>Žodžių formos tikrinamos apytiksliai (pvz. „registracija“ tinka ir „registracijos“). Rašykite natūraliai: frazės kartoti daug kartų nereikia.</p>
    </div>
  )
}

/** Text of the first paragraph of rich-text HTML (where readers and Google look first). */
export function firstParagraph(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const p of Array.from(doc.querySelectorAll('p'))) {
    const t = (p.textContent ?? '').trim()
    if (t) return t
  }
  return (doc.body.textContent ?? '').trim().slice(0, 400)
}

/** Text of all h2/h3 subheadings in rich-text HTML. */
export function subheadings(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.querySelectorAll('h2, h3')).map(h => h.textContent ?? '').join(' · ')
}
