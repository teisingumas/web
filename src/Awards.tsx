import { useState } from 'react'
import { PATHS } from './router'
import AWARDS from './content/apdovanojimai.json'

// /apie-studija/apdovanojimai: every result since 2008, one fold per year.
// The list lives in src/content/apdovanojimai.txt; scripts/build-awards.mjs turns it into the JSON read here.

/** r: place (1, 2, 24 …), 'GP' Grand Prix, 'A' another award (a cup, best choreography), null no place given */
type Result = { r: number | 'GP' | 'A' | null; t: string; w: string }
type Competition = { name: string; city: string; results: Result[] }
type Year = { year: number; events: Competition[] }

const YEARS = AWARDS as Year[]
const ALL = YEARS.flatMap(y => y.events.flatMap(e => e.results))
const count = (list: Result[], r: Result['r']) => list.filter(x => x.r === r).length
const TOTALS = {
  results: ALL.length,
  first: count(ALL, 1),
  gp: count(ALL, 'GP'),
  competitions: YEARS.reduce((n, y) => n + y.events.length, 0),
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
const rankLabel = (r: Result['r']) => (r === 'GP' ? 'GP' : r === 'A' ? '★' : r === null ? '–' : ROMAN[r] ?? String(r))
const rankClass = (r: Result['r']) => (r === 1 || r === 'GP' || r === 'A' ? 'aw-rank aw-rank--top' : 'aw-rank')

function lt(n: number, one: string, few: string, many: string) {
  const d = n % 10, dd = n % 100
  if (d === 1 && dd !== 11) return `${n} ${one}`
  if (d >= 2 && d <= 9 && (dd < 12 || dd > 19)) return `${n} ${few}`
  return `${n} ${many}`
}

function YearFold({ y, open, onToggle }: { y: Year; open: boolean; onToggle: () => void }) {
  const results = y.events.flatMap(e => e.results)
  const chips = [
    { n: count(results, 'GP'), label: 'Grand Prix', cls: 'aw-chip aw-chip--dark' },
    { n: count(results, 1), label: 'I vt.', cls: 'aw-chip aw-chip--pink' },
    { n: count(results, 2), label: 'II vt.', cls: 'aw-chip' },
    { n: count(results, 3), label: 'III vt.', cls: 'aw-chip' },
  ].filter(c => c.n)
  const id = `aw-${y.year}`
  return (
    <section className={open ? 'aw-year is-open' : 'aw-year'} id={`metai-${y.year}`}>
      <h2 className="aw-year__h">
        <button type="button" className="aw-year__btn" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          <span className="aw-year__num">{y.year}</span>
          <span className="aw-year__sum">
            <span className="aw-year__count">
              {lt(results.length, 'apdovanojimas', 'apdovanojimai', 'apdovanojimų')}
              <small>{lt(y.events.length, 'varžybos', 'varžybos', 'varžybų')}</small>
            </span>
            <span className="aw-chips">{chips.map(c => <span key={c.label} className={c.cls}>{c.n}× {c.label}</span>)}</span>
          </span>
          <span className="aw-year__chev" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </button>
      </h2>
      {/* closed years are not rendered at all: the full list is over a thousand rows */}
      <div id={id} className="aw-year__body" hidden={!open}>
        {open && y.events.map((e, i) => (
          <div key={i} className="aw-comp">
            <h3 className="aw-comp__name">
              {e.name}
              {e.city && <span className="aw-comp__city">{e.city}</span>}
            </h3>
            <ol className="aw-rows">
              {e.results.map((r, j) => (
                <li key={j} className="aw-row">
                  <span className={rankClass(r.r)} aria-label={r.r === 'GP' ? 'Grand Prix' : typeof r.r === 'number' ? `${r.r} vieta` : undefined}>
                    {rankLabel(r.r)}{typeof r.r === 'number' && <small aria-hidden="true">vt.</small>}
                  </span>
                  <span className="aw-row__text">
                    {r.t && <span className="aw-row__cat">{r.t}</span>}
                    <span className="aw-row__who">{r.w}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Awards() {
  const [open, setOpen] = useState<Set<number>>(() => new Set([YEARS[0]?.year]))
  const toggle = (year: number) => setOpen(prev => {
    const next = new Set(prev)
    if (next.has(year)) next.delete(year)
    else next.add(year)
    return next
  })
  const first = YEARS[YEARS.length - 1]?.year
  return (
    <main className="ng-wrap aw-page">
      <div className="aw">
        <header className="aw-hero">
          <div>
            <span className="aw-kicker">Apie studiją</span>
            <h1 className="aw-h1">Apdovanojimai</h1>
            <p className="aw-lead">
              Me Gusta šokėjų rezultatai varžybose ir festivaliuose Lietuvoje ir užsienyje nuo {first} metų.
              Išskleiskite metus ir pamatykite visas tų metų vietas.
            </p>
          </div>
          <dl className="aw-stats">
            <div><dt>Apdovanojimų</dt><dd>{TOTALS.results}</dd></div>
            <div><dt>I vietų</dt><dd>{TOTALS.first}</dd></div>
            <div><dt>Grand Prix</dt><dd>{TOTALS.gp}</dd></div>
            <div><dt>Varžybų</dt><dd>{TOTALS.competitions}</dd></div>
          </dl>
        </header>

        <div className="aw-tools">
          <button type="button" className="aw-tool" onClick={() => setOpen(new Set(YEARS.map(y => y.year)))}>Išskleisti visus</button>
          <button type="button" className="aw-tool" onClick={() => setOpen(new Set())}>Suskleisti visus</button>
        </div>

        {YEARS.map(y => <YearFold key={y.year} y={y} open={open.has(y.year)} onToggle={() => toggle(y.year)} />)}
      </div>

      <div className="aw-cta">
        <p>Nori šokti komandoje ir važiuoti į varžybas?</p>
        <a href={PATHS.registration} className="ng-btn ng-btn--dark">Registruotis į pamoką</a>
      </div>
      <style>{CSS}</style>
    </main>
  )
}

// Same shape language as the rest of the site (32px blocks, pills), set as a dark results sheet:
// outlined year numbers that fill with pink when a year is open, places in a fixed column.
const CSS = `
  .aw-page { padding-top: 140px; padding-bottom: 40px; }
  .aw { border-radius: 32px; background: #111; color: #F4F3EF; padding: clamp(22px, 4vw, 56px); }
  .aw-hero { display: flex; justify-content: space-between; align-items: flex-end; gap: 32px; flex-wrap: wrap; padding-bottom: 32px; border-bottom: 2px solid var(--ng-accent); }
  .aw-kicker { display: block; margin-bottom: 14px; font: 800 12px 'Manrope', sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ng-accent); }
  .aw-h1 { margin: 0; font-family: 'Archivo', sans-serif; font-weight: 900; font-stretch: 75%; font-size: clamp(52px, 9vw, 128px); line-height: 0.86; letter-spacing: -0.01em; text-transform: uppercase; }
  .aw-lead { margin: 20px 0 0; max-width: 56ch; font-size: 17px; line-height: 1.6; color: rgba(244, 243, 239, 0.72); }
  .aw-stats { display: grid; grid-template-columns: repeat(4, auto); gap: 8px 32px; margin: 0; }
  .aw-stats div { display: flex; flex-direction: column-reverse; gap: 6px; }
  .aw-stats dt { font-size: 13px; font-weight: 700; color: rgba(244, 243, 239, 0.6); }
  .aw-stats dd { margin: 0; font-family: 'Archivo', sans-serif; font-weight: 900; font-stretch: 75%; font-size: clamp(36px, 4vw, 56px); line-height: 0.9; font-variant-numeric: tabular-nums; }
  .aw-stats div:first-child dd { color: var(--ng-accent); }

  .aw-tools { display: flex; gap: 8px; flex-wrap: wrap; padding: 22px 0 6px; }
  .aw-tool { min-height: 40px; padding: 8px 18px; border-radius: 999px; border: 1px solid rgba(244, 243, 239, 0.28); background: transparent; color: #F4F3EF; cursor: pointer; font: 700 13px 'Manrope', sans-serif; transition: border-color 0.2s, color 0.2s; }
  .aw-tool:hover { border-color: var(--ng-accent); color: var(--ng-accent); }
  .aw-tool:focus-visible, .aw-year__btn:focus-visible { outline: 2px solid var(--ng-accent); outline-offset: 3px; }

  .aw-year { border-bottom: 1px solid rgba(244, 243, 239, 0.16); scroll-margin-top: 110px; }
  .aw-year__h { margin: 0; font: inherit; }
  .aw-year__btn { width: 100%; display: grid; grid-template-columns: 240px minmax(0, 1fr) 48px; align-items: center; gap: 28px; padding: 22px 0; border: 0; background: transparent; color: inherit; cursor: pointer; text-align: left; }
  .aw-year__num { font-family: 'Archivo', sans-serif; font-weight: 900; font-stretch: 70%; font-size: clamp(60px, 8vw, 108px); line-height: 0.8; letter-spacing: -0.02em; color: transparent; -webkit-text-stroke: 1.5px #F4F3EF; font-variant-numeric: tabular-nums; transition: color 0.25s, -webkit-text-stroke-color 0.25s; }
  .aw-year__btn:hover .aw-year__num, .aw-year.is-open .aw-year__num { color: var(--ng-accent); -webkit-text-stroke-color: var(--ng-accent); }
  .aw-year__sum { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
  .aw-year__count { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 20px; }
  .aw-year__count small { margin-left: 10px; font: 600 14px 'Manrope', sans-serif; color: rgba(244, 243, 239, 0.55); }
  .aw-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .aw-chip { display: inline-flex; padding: 5px 11px; border-radius: 999px; border: 1px solid rgba(244, 243, 239, 0.28); font: 700 12px/1.2 'Manrope', sans-serif; white-space: nowrap; }
  .aw-chip--pink { background: var(--ng-accent); border-color: var(--ng-accent); color: #111; }
  .aw-chip--dark { background: #F4F3EF; border-color: #F4F3EF; color: #111; }
  .aw-year__chev { width: 48px; height: 48px; border-radius: 999px; border: 1px solid rgba(244, 243, 239, 0.28); display: grid; place-items: center; transition: transform 0.3s, background-color 0.2s; }
  .aw-year.is-open .aw-year__chev { transform: rotate(180deg); background: var(--ng-accent); border-color: var(--ng-accent); color: #111; }

  .aw-year__body { padding: 0 0 32px calc(240px + 28px); display: flex; flex-direction: column; gap: 28px; }
  .aw-comp__name { margin: 0 0 6px; display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; font-family: 'Archivo', sans-serif; font-weight: 900; font-size: clamp(20px, 2vw, 26px); line-height: 1.1; letter-spacing: -0.01em; color: var(--ng-accent); overflow-wrap: anywhere; }
  .aw-comp__city { font: 700 13px 'Manrope', sans-serif; letter-spacing: 0; color: rgba(244, 243, 239, 0.55); }
  .aw-rows { list-style: none; margin: 0; padding: 0; }
  .aw-row { display: grid; grid-template-columns: 80px minmax(0, 1fr); align-items: baseline; gap: 18px; padding: 11px 0; border-top: 1px solid rgba(244, 243, 239, 0.1); }
  .aw-row:first-child { border-top: 0; }
  .aw-rank { font-family: 'Archivo', sans-serif; font-weight: 900; font-stretch: 75%; font-size: 30px; line-height: 1; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .aw-rank small { margin-left: 5px; font: 700 11px 'Manrope', sans-serif; color: rgba(244, 243, 239, 0.45); }
  .aw-rank--top { color: var(--ng-accent); }
  .aw-row__text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .aw-row__cat { font-size: 13px; font-weight: 600; color: rgba(244, 243, 239, 0.6); overflow-wrap: anywhere; }
  .aw-row__who { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 18px; line-height: 1.25; overflow-wrap: anywhere; }

  .aw-cta { margin-top: 16px; padding: 28px 32px; border-radius: 32px; background: #fff; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .aw-cta p { margin: 0; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 22px; color: #111; }

  @media (max-width: 900px) {
    .aw-stats { grid-template-columns: repeat(2, auto); }
    .aw-year__btn { grid-template-columns: minmax(0, 1fr) 48px; gap: 14px 16px; }
    .aw-year__sum { grid-column: 1 / -1; grid-row: 2; }
    .aw-year__body { padding-left: 0; }
  }
  @media (max-width: 560px) {
    .aw-page { padding-top: 120px; }
    .aw-row { grid-template-columns: 58px minmax(0, 1fr); gap: 12px; }
    .aw-rank { font-size: 24px; }
    .aw-rank small { display: none; }
    .aw-cta { padding: 24px; }
  }
  @media (prefers-reduced-motion: reduce) { .aw-year__num, .aw-year__chev { transition: none; } }
`
