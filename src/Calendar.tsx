import { useEffect, useMemo, useRef, useState } from 'react'
import { inlineData, section } from './content'
import type { EventCard, EventsData } from './content/types'
import { dayOf, isMultiDay, isOngoing, isPast, lastDay, monthKey, monthLabel, monthShort, monthsOf, priceText, timeText, todayVilnius, weekdayOf, yearOf } from './eventFormat'
import { fetchEvents } from './publicApi'
import { pageTitle } from './seo'

type View = 'up' | 'past'

// The data the server rendered comes inline; opening the calendar from another page fetches it.
let inlineEvents: EventsData | null = inlineData.view?.type === 'events' ? inlineData.view.data : null

function plural(n: number) {
  const t = n % 10
  const h = n % 100
  if (t === 1 && h !== 11) return `${n} renginys`
  if (t >= 2 && t <= 9 && (h < 12 || h > 19)) return `${n} renginiai`
  return `${n} renginių`
}

const byStart = (a: EventCard, b: EventCard) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : lastDay(a) < lastDay(b) ? -1 : lastDay(a) > lastDay(b) ? 1 : 0)

export default function Calendar() {
  const cal = section('calendar')
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; data?: EventsData }>(() =>
    inlineEvents ? { status: 'ready', data: inlineEvents } : { status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState<View>('up')
  const [month, setMonth] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => { document.title = pageTitle('kalendorius') }, [])

  useEffect(() => {
    if (inlineEvents) {
      setState({ status: 'ready', data: inlineEvents })
      inlineEvents = null
      return
    }
    let cancelled = false
    setState(s => ({ status: 'loading', data: s.data }))
    fetchEvents()
      .then(data => { if (!cancelled) setState({ status: 'ready', data }) })
      .catch(() => { if (!cancelled) setState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [attempt])

  // the month menu closes on Escape and on a click anywhere else
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => { if (!filterRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const today = todayVilnius()
  const lists = useMemo(() => {
    const data = state.data
    if (!data) return null
    // the lists come split by the server's clock; split again by the visitor's day so an open tab stays right
    const all = [...data.upcoming, ...data.past]
    const up = all.filter(e => !isPast(e, today)).sort(byStart)
    const past = all.filter(e => isPast(e, today)).sort((a, b) => (lastDay(a) > lastDay(b) ? -1 : lastDay(a) < lastDay(b) ? 1 : 0))
    return { up, past }
  }, [state.data, today])

  const isUp = view === 'up'
  const list = lists ? (isUp ? lists.up : lists.past) : []

  // month filter options: every month an event touches (a several-day event counts in each)
  const { options, groups, selected } = useMemo(() => {
    const nowKey = monthKey(today)
    const counts: Record<string, number> = {}
    for (const e of list) for (const k of monthsOf(e)) { if (isUp && k < nowKey) continue; counts[k] = (counts[k] ?? 0) + 1 }
    const keys = Object.keys(counts).sort()
    if (!isUp) keys.reverse()
    const sel = month !== 'all' && counts[month] ? month : 'all'
    const opts = [{ key: 'all', label: 'Visi mėnesiai', count: list.length }, ...keys.map(k => ({ key: k, label: monthLabel(k), count: counts[k] }))]

    // grouped by month: an event sits under its first month (an ongoing one under this month);
    // with a month picked, every event touching it is listed under it
    const grouped: { key: string; label: string; events: EventCard[] }[] = []
    const byKey: Record<string, (typeof grouped)[number]> = {}
    for (const e of list) {
      let k: string
      if (sel === 'all') {
        k = monthKey(e.startDate)
        if (isUp && k < nowKey) k = nowKey
      } else {
        if (!monthsOf(e).includes(sel)) continue
        k = sel
      }
      const g = byKey[k] ?? (byKey[k] = { key: k, label: monthLabel(k), events: [] })
      if (!grouped.includes(g)) grouped.push(g)
      g.events.push(e)
    }
    return { options: opts, groups: grouped, selected: sel }
  }, [list, isUp, month, today])

  const pick = (v: View) => { setView(v); setMonth('all'); setMenuOpen(false) }
  const selectedLabel = options.find(o => o.key === selected)?.label ?? 'Visi mėnesiai'

  return (
    <section id="kalendorius" className="cal">
      <div className="ng-wrap">
        <header className="ng-head cal-head">
          <span className="ng-kicker">{cal.kicker}</span>
          <h1 className="ng-h2 cal-h1">{cal.title}</h1>
          {cal.intro && <p className="cal-intro">{cal.intro}</p>}
        </header>

        <div className="cal-toolbar">
          <div role="tablist" aria-label="Renginių filtras" className="cal-tabs">
            <button type="button" role="tab" aria-selected={isUp} className="cal-tab" onClick={() => pick('up')}>Artėjantys{lists ? <span className="cal-tab__n">{lists.up.length}</span> : null}</button>
            <button type="button" role="tab" aria-selected={!isUp} className="cal-tab" onClick={() => pick('past')}>Praėję{lists ? <span className="cal-tab__n">{lists.past.length}</span> : null}</button>
          </div>
          {options.length > 1 && (
            <div className="cal-mf" ref={filterRef}>
              <button type="button" className={`cal-mf-btn${menuOpen ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
                <span className="cal-mf-btn__label">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                  <span>{selectedLabel}</span>
                </span>
                <svg className="cal-mf-btn__chev" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {menuOpen && (
                <div className="cal-mf-panel" role="menu" aria-label="Mėnesio filtras">
                  {options.map(o => (
                    <button key={o.key} type="button" role="menuitemradio" aria-checked={o.key === selected} className={`cal-mf-opt${o.key === selected ? ' is-on' : ''}`}
                      onClick={() => { setMonth(o.key); setMenuOpen(false) }}>
                      <span>{o.label}</span><small>{plural(o.count)}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {state.status === 'loading' && !state.data && (
          <div aria-busy="true" aria-label="Kraunami renginiai" className="cal-list cal-list--top">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="cal-ev cal-ev--skeleton" aria-hidden="true">
                <div className="cal-date cal-skel" />
                <div className="cal-thumb cal-skel" />
                <div className="cal-body">
                  <span className="cal-skel" style={{ width: '30%' }} />
                  <span className="cal-skel" style={{ width: '70%', height: 28 }} />
                  <span className="cal-skel" style={{ width: '90%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" className="cal-box">
            <p>Nepavyko įkelti renginių. Patikrinkite interneto ryšį ir bandykite dar kartą.</p>
            <button type="button" className="ng-btn ng-btn--dark" onClick={() => setAttempt(a => a + 1)}>Bandyti dar kartą</button>
          </div>
        )}

        {lists && list.length === 0 && (
          <div className="cal-box"><p>{isUp ? cal.emptyUpcoming : cal.emptyPast}</p></div>
        )}

        {groups.map(g => (
          <section key={g.key} className="cal-month" aria-labelledby={`cal-m-${g.key}`}>
            <h2 className="cal-month__head" id={`cal-m-${g.key}`}>
              {g.label}
              <span className="cal-month__count">{plural(g.events.length)}</span>
            </h2>
            <div className="cal-list">
              {g.events.map(e => <EventRow key={e.slug} event={e} today={today} />)}
            </div>
          </section>
        ))}

        {lists && (
          <div className="cal-foot">
            {isUp ? (
              lists.past.length > 0 && <button type="button" className="ng-btn ng-btn--ghost cal-foot__btn" onClick={() => pick('past')}>← Praėję renginiai</button>
            ) : (
              <>
                <p>Rodoma ne daugiau kaip 15 paskutinių praėjusių renginių.</p>
                <button type="button" className="ng-btn ng-btn--dark" onClick={() => pick('up')}>Artėjantys renginiai →</button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{CSS}</style>
    </section>
  )
}

// One shape language, as on the rest of the site: blocks are white with 32px corners (24px inside),
// photos 20px, and everything you press or read as a label is a pill.
const CSS = `
  .cal { padding: 168px 0 120px; background: var(--cream, #F4F3EF); }
  .cal-head { margin-bottom: 36px; }
  .cal-h1 { font-size: clamp(48px, 6vw, 88px); }
  .cal-intro { margin: 6px 0 0; max-width: 600px; font-size: 18px; line-height: 1.55; color: #3D3D3D; }

  .cal-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .cal-tabs { display: flex; gap: 2px; padding: 5px; border-radius: 999px; background: #fff; }
  .cal-tab { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 10px 20px; border: 0; border-radius: 999px; background: transparent; color: #111; cursor: pointer; font: 700 15px 'Manrope', sans-serif; transition: background-color 0.2s, color 0.2s; }
  .cal-tab:hover { background: #F0EEE8; }
  .cal-tab[aria-selected="true"] { background: #111; color: #fff; }
  .cal-tab__n { min-width: 24px; padding: 2px 8px; border-radius: 999px; background: #F0EEE8; color: #111; font-size: 13px; font-weight: 800; text-align: center; }
  .cal-tab[aria-selected="true"] .cal-tab__n { background: #F7B1D4; }
  .cal-tab:focus-visible, .cal-mf-btn:focus-visible, .cal-mf-opt:focus-visible { outline: 2px solid #111; outline-offset: 2px; }

  .cal-mf { position: relative; }
  .cal-mf-btn { display: inline-flex; align-items: center; justify-content: space-between; gap: 16px; min-width: 230px; min-height: 54px; padding: 10px 18px 10px 20px; border: 0; border-radius: 999px; background: #fff; color: #111; cursor: pointer; font: 700 15px 'Manrope', sans-serif; transition: background-color 0.2s; }
  .cal-mf-btn:hover, .cal-mf-btn.is-open { background: #F0EEE8; }
  .cal-mf-btn__label { display: inline-flex; align-items: center; gap: 10px; }
  .cal-mf-btn__chev { transition: transform 260ms ease; }
  .cal-mf-btn.is-open .cal-mf-btn__chev { transform: rotate(180deg); }
  .cal-mf-panel { position: absolute; right: 0; top: calc(100% + 8px); z-index: 20; min-width: 100%; display: flex; flex-direction: column; gap: 2px; padding: 8px; border-radius: 24px; background: #fff; box-shadow: 0 18px 40px rgba(17,17,17,0.12); }
  .cal-mf-opt { display: flex; justify-content: space-between; align-items: center; gap: 24px; width: 100%; min-height: 44px; padding: 10px 14px; border: 0; border-radius: 999px; background: transparent; color: #111; cursor: pointer; text-align: left; white-space: nowrap; font: 700 15px 'Manrope', sans-serif; }
  .cal-mf-opt:hover { background: #F0EEE8; }
  .cal-mf-opt.is-on { background: #111; color: #fff; }
  .cal-mf-opt small { font-size: 13px; font-weight: 600; opacity: 0.65; }

  .cal-month { margin-top: 56px; }
  .cal-month__head { margin: 0 0 18px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-family: 'Archivo', sans-serif; font-weight: 900; font-size: clamp(28px, 3vw, 40px); line-height: 1; letter-spacing: -0.02em; color: #111; }
  .cal-month__count { padding: 6px 12px; border-radius: 999px; background: #fff; font: 700 13px 'Manrope', sans-serif; letter-spacing: 0; color: #555; }
  .cal-list { display: flex; flex-direction: column; gap: 16px; }
  .cal-list--top { margin-top: 32px; }

  .cal-ev { position: relative; display: grid; grid-template-columns: 128px minmax(0, 300px) minmax(0, 1fr); gap: 28px; align-items: stretch; padding: 16px; padding-right: 28px; border-radius: 32px; background: #fff; transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.25s; }
  .cal-ev:not(.cal-ev--skeleton):hover { transform: translateY(-3px); box-shadow: 0 16px 36px rgba(17,17,17,0.08); }
  .cal-date { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 16px 8px; border-radius: 24px; background: #F7B1D4; color: #111; text-align: center; }
  .cal-ev.is-past .cal-date { background: #F0EEE8; color: #555; }
  .cal-date__day { font-family: 'Archivo', sans-serif; font-weight: 900; font-size: 60px; line-height: 0.9; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
  .cal-date__month { font-weight: 800; font-size: 15px; }
  .cal-date__sub { font-size: 13px; font-weight: 600; opacity: 0.7; }
  .cal-thumb { display: block; position: relative; aspect-ratio: 16 / 10; border-radius: 20px; overflow: hidden; background: #F0EEE8; align-self: center; }
  .cal-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 0; transition: transform 500ms ease; }
  .cal-ev:hover .cal-thumb img { transform: scale(1.05); }
  .cal-thumb img.is-past { filter: grayscale(1); opacity: 0.75; }
  .cal-body { display: flex; flex-direction: column; justify-content: center; gap: 12px; min-width: 0; padding: 8px 52px 8px 0; }
  .cal-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .cal-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: #F0EEE8; color: #111; font: 700 13px/1.2 'Manrope', sans-serif; }
  .cal-pill--renginys { background: #F7B1D4; }
  .cal-pill--varzybos { background: #111; color: #fff; }
  .cal-pill--live { background: #111; color: #fff; }
  .cal-pill--live i { width: 7px; height: 7px; border-radius: 999px; background: #F7B1D4; }
  .cal-title { margin: 0; font-family: 'Archivo', sans-serif; font-weight: 900; font-size: clamp(24px, 2.3vw, 32px); line-height: 1.05; letter-spacing: -0.02em; color: #111; overflow-wrap: anywhere; text-wrap: balance; }
  .cal-title a { color: inherit; text-decoration: none; }
  .cal-title a::after { content: ""; position: absolute; inset: 0; border-radius: 32px; }
  .cal-excerpt { margin: 0; max-width: 620px; font-size: 15px; line-height: 1.6; color: #3D3D3D; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .cal-meta { display: flex; flex-wrap: wrap; gap: 6px 20px; margin: 0; padding: 0; list-style: none; font-size: 14px; color: #555; }
  .cal-meta li { display: inline-flex; align-items: center; gap: 7px; }
  .cal-meta b { font-weight: 700; color: #111; }
  .cal-more { position: absolute; right: 20px; top: 20px; width: 44px; height: 44px; border-radius: 999px; background: #F0EEE8; color: #111; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s, transform 0.25s cubic-bezier(0.23, 1, 0.32, 1); pointer-events: none; }
  .cal-ev:hover .cal-more { background: #F7B1D4; transform: translateX(3px); }
  .cal-ev:has(.cal-title a:focus-visible) { outline: 2px solid #111; outline-offset: 3px; }
  .cal-title a:focus-visible { outline: none; }

  .cal-box { margin-top: 32px; padding: 28px 32px; border-radius: 32px; background: #fff; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .cal-box p { margin: 0; font-size: 16px; color: #3D3D3D; }
  .cal-foot { margin-top: 48px; display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
  .cal-foot p { margin: 0; font-size: 14px; color: #6B6A63; }
  .cal-skel { display: block; height: 14px; border-radius: 999px; background: #F0EEE8; animation: calPulse 1.2s ease-in-out infinite alternate; }
  .cal-date.cal-skel, .cal-thumb.cal-skel { height: auto; min-height: 140px; border-radius: 24px; }
  @keyframes calPulse { from { opacity: 1; } to { opacity: 0.45; } }

  @media (max-width: 1024px) { .cal-ev { grid-template-columns: 112px minmax(0, 220px) minmax(0, 1fr); gap: 22px; } .cal-date__day { font-size: 50px; } }
  @media (max-width: 760px) {
    .cal { padding-top: 130px; }
    .cal-toolbar { flex-direction: column; align-items: stretch; }
    .cal-tabs { align-self: flex-start; }
    .cal-mf, .cal-mf-btn { width: 100%; }
    .cal-ev { grid-template-columns: 1fr; gap: 0; padding: 12px; border-radius: 28px; }
    .cal-thumb { grid-row: 1; border-radius: 20px; }
    .cal-date { grid-row: 1; position: absolute; left: 24px; top: 24px; z-index: 1; padding: 10px 12px; min-width: 76px; border-radius: 18px; }
    .cal-date__day { font-size: 36px; }
    .cal-date__month { font-size: 13px; }
    .cal-date__sub { display: none; }
    .cal-body { padding: 18px 10px 10px; }
    .cal-more { top: 24px; right: 24px; z-index: 1; background: #fff; }
    .cal-body { padding-right: 10px; }
    .cal-title a::after { border-radius: 28px; }
    .cal-ev--skeleton .cal-date { display: none; }
    .cal-month { margin-top: 44px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cal-ev, .cal-thumb img, .cal-mf-btn__chev, .cal-more { transition: none; }
    .cal-ev:not(.cal-ev--skeleton):hover { transform: none; }
    .cal-skel { animation: none; }
  }
`

const ico = { 'aria-hidden': true, width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function EventRow({ event: e, today }: { event: EventCard; today: string }) {
  const past = isPast(e, today)
  const multi = isMultiDay(e)
  const href = `/kalendorius/${e.slug}`
  const time = timeText(e)
  const price = priceText(e.price)
  return (
    <article className={`cal-ev${past ? ' is-past' : ''}`}>
      <div className="cal-date">
        <span className="cal-date__day">{dayOf(e.startDate)}</span>
        <span className="cal-date__month">{monthShort(e.startDate)} {yearOf(e.startDate)}</span>
        <span className="cal-date__sub">{multi ? `iki ${dayOf(e.endDate!)} ${monthShort(e.endDate!)}` : weekdayOf(e.startDate)}</span>
      </div>
      <div className="cal-thumb" aria-hidden="true">
        {e.cover.src && <img src={e.cover.src} alt="" className={past ? 'is-past' : undefined} loading="lazy" />}
      </div>
      <div className="cal-body">
        <div className="cal-tags">
          <span className={`cal-pill cal-pill--${e.type}`}>{e.typeLabel}</span>
          {multi && <span className="cal-pill">Kelių dienų</span>}
          {time && <span className="cal-pill"><svg {...ico}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>{time}</span>}
          {!past && isOngoing(e, today) && <span className="cal-pill cal-pill--live"><i aria-hidden="true" />Vyksta dabar</span>}
          {past && <span className="cal-pill">Įvyko</span>}
        </div>
        <h3 className="cal-title"><a href={href}>{e.title}</a></h3>
        {e.excerpt && <p className="cal-excerpt">{e.excerpt}</p>}
        <ul className="cal-meta">
          {e.venue && <li><svg {...ico}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg><b>{e.venue.name}</b></li>}
          {e.organizer && <li><svg {...ico}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>Organizuoja <b>{e.organizer.name}</b></li>}
          {price && <li><svg {...ico}><path d="M17 6.5A6 6 0 0 0 7 9v6a6 6 0 0 0 10 2.5M4 10.5h9M4 13.5h9" /></svg><b>{price}</b></li>}
        </ul>
      </div>
      <span className="cal-more" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </article>
  )
}
