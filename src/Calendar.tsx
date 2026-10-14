import { useEffect, useMemo, useRef, useState } from 'react'
import { inlineData, section } from './content'
import type { EventCard, EventsData } from './content/types'
import { dayOf, isMultiDay, isOngoing, isPast, lastDay, monthKey, monthLabel, monthShort, monthsOf, priceText, timeText, todayVilnius, weekdayOf, yearOf } from './eventFormat'
import { fetchEvents } from './publicApi'
import { pageTitle } from './seo'

const display = "'Barlow Condensed', sans-serif"
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
    <section id="kalendorius" style={{ padding: '168px 0 120px', backgroundColor: 'var(--bg)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <header style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            ◆&nbsp;&nbsp;{cal.kicker}
          </p>
          <h1 style={{ fontFamily: display, fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)', margin: 0 }}>
            {cal.title}
          </h1>
          {cal.intro && <p style={{ margin: '24px 0 0', fontSize: 17, color: 'var(--c-a8a8a8)', lineHeight: 1.6, maxWidth: 560, fontWeight: 300 }}>{cal.intro}</p>}
        </header>

        <div className="cal-toolbar">
          <div role="tablist" aria-label="Renginių filtras" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button type="button" role="tab" aria-selected={isUp} className="day-tab cal-tab" onClick={() => pick('up')}><span>Artėjantys{lists ? ` (${lists.up.length})` : ''}</span></button>
            <button type="button" role="tab" aria-selected={!isUp} className="day-tab cal-tab" onClick={() => pick('past')}><span>Praėję{lists ? ` (${lists.past.length})` : ''}</span></button>
          </div>
          {options.length > 1 && (
            <div className="cal-mf" ref={filterRef}>
              <button type="button" className={`cal-mf-btn${menuOpen ? ' is-open' : ''}`} aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><rect x="3" y="5" width="18" height="16" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                  <span>{selectedLabel}</span>
                </span>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M6 9l6 6 6-6" /></svg>
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
          <div aria-busy="true" aria-label="Kraunami renginiai" style={{ marginTop: 32 }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="cal-ev cal-ev--skeleton" aria-hidden="true">
                <div><span className="cal-skel" style={{ width: 80, height: 64 }} /></div>
                <div className="cal-thumb cal-skel" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span className="cal-skel" style={{ width: '30%' }} />
                  <span className="cal-skel" style={{ width: '70%', height: 28 }} />
                  <span className="cal-skel" style={{ width: '90%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" style={{ marginTop: 32, border: '1px solid var(--line)', padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)' }}>Nepavyko įkelti renginių. Patikrinkite interneto ryšį ir bandykite dar kartą.</p>
            <button type="button" className="cal-btn" onClick={() => setAttempt(a => a + 1)}>Bandyti dar kartą</button>
          </div>
        )}

        {lists && list.length === 0 && (
          <p style={{ margin: '32px 0 0', padding: '32px 24px', border: '1px solid var(--line)', fontSize: 15, color: 'var(--text-2)' }}>
            {isUp ? cal.emptyUpcoming : cal.emptyPast}
          </p>
        )}

        {groups.map(g => (
          <div key={g.key} className="cal-month">
            <h2 className="cal-month__head">
              <span>{g.label}</span>
              <span className="cal-month__count">{plural(g.events.length)}</span>
            </h2>
            {g.events.map(e => <EventRow key={e.slug} event={e} today={today} />)}
          </div>
        ))}

        {lists && (
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {isUp ? (
              lists.past.length > 0 && <button type="button" className="cal-ghost" onClick={() => pick('past')}>← Praėję renginiai</button>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Rodoma ne daugiau kaip 15 paskutinių praėjusių renginių.</p>
                <button type="button" className="cal-btn" onClick={() => pick('up')}>Artėjantys renginiai →</button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        .cal-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .cal-tab { padding: 14px 24px; min-height: 48px; cursor: pointer; font-family: ${display}; font-weight: 800; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase; }
        .cal-mf { position: relative; }
        .cal-mf-btn {
          display: inline-flex; align-items: center; justify-content: space-between; gap: 16px; min-width: 240px; min-height: 48px; padding: 12px 16px 12px 18px;
          background: var(--surface-2); border: 1px solid var(--c-1e1e1e); color: var(--text); cursor: pointer;
          font-family: ${display}; font-weight: 800; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase; transition: border-color 0.2s;
        }
        .cal-mf-btn:hover, .cal-mf-btn:focus-visible, .cal-mf-btn.is-open { border-color: #FFB3C6; outline: none; }
        .cal-mf-btn > svg { transition: transform 260ms ease; color: var(--pink-text); }
        .cal-mf-btn.is-open > svg { transform: rotate(180deg); }
        .cal-mf-panel { position: absolute; right: 0; top: calc(100% + 4px); z-index: 20; min-width: 100%; background: var(--bg); border: 1px solid var(--line-strong); display: flex; flex-direction: column; padding: 4px; }
        .cal-mf-opt {
          display: flex; justify-content: space-between; align-items: center; gap: 24px; width: 100%; min-height: 44px; padding: 10px 14px; background: transparent; border: 0;
          color: var(--text-2); cursor: pointer; text-align: left; font-family: ${display}; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase; white-space: nowrap;
        }
        .cal-mf-opt:hover, .cal-mf-opt:focus-visible { background: #FFB3C6; color: #080808; outline: none; }
        .cal-mf-opt.is-on { color: var(--pink-text); }
        .cal-mf-opt.is-on:hover, .cal-mf-opt.is-on:focus-visible { color: #080808; }
        .cal-mf-opt small { font-family: 'Outfit', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0; text-transform: none; opacity: 0.8; }
        .cal-month { border: 1px solid var(--line); margin-top: 32px; }
        .cal-month__head {
          margin: 0; padding: 18px 24px; background-color: var(--surface); display: flex; justify-content: space-between; align-items: baseline; gap: 16px;
          font-family: ${display}; font-weight: 800; font-size: 24px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text);
        }
        .cal-month__count { font-size: 13px; font-weight: 700; letter-spacing: 2px; color: var(--muted); }
        .cal-ev { display: grid; grid-template-columns: 132px 304px minmax(0, 1fr); gap: 32px; align-items: start; padding: 32px 24px; border-top: 1px solid var(--line-soft); transition: background-color 220ms ease; }
        .cal-month .cal-ev:hover { background: var(--surface); }
        .cal-ev--skeleton { border: 1px solid var(--line); margin-bottom: 16px; }
        .cal-thumb { display: block; position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--surface-2); }
        .cal-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 500ms ease; }
        .cal-ev:hover .cal-thumb img { transform: scale(1.06); }
        .cal-thumb img.is-past { filter: grayscale(1); opacity: 0.7; }
        .ev-tag { display: inline-block; padding: 5px 10px; font-family: ${display}; font-weight: 700; font-size: 12px; letter-spacing: 2.5px; text-transform: uppercase; line-height: 1; }
        .ev-tag--renginys { background: #FFB3C6; color: #080808; border: 1px solid #FFB3C6; }
        .ev-tag--varzybos { background: transparent; color: var(--pink-text); border: 1px solid var(--pink-text); }
        .ev-tag--kita { background: transparent; color: var(--text-2); border: 1px solid var(--line-strong); }
        .cal-chip { display: inline-block; padding: 5px 10px; font-family: ${display}; font-weight: 700; font-size: 12px; letter-spacing: 2.5px; text-transform: uppercase; line-height: 1; color: var(--text); border: 1px dashed var(--pink-text); }
        /* "Plačiau apie renginį": outline that fills with pink from left to right on hover, like the day tabs */
        .cal-cta {
          position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 12px; align-self: flex-start; min-height: 48px; margin-top: 6px; padding: 12px 24px;
          color: var(--text); border: 1px solid var(--text); text-decoration: none;
          font-family: ${display}; font-weight: 800; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase;
          transition: color 260ms cubic-bezier(0.23, 1, 0.32, 1), border-color 260ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .cal-cta::before { content: ''; position: absolute; inset: 0; background: #FFB3C6; transform: scaleX(0); transform-origin: left center; transition: transform 320ms cubic-bezier(0.23, 1, 0.32, 1); }
        .cal-cta > * { position: relative; }
        .cal-cta:hover, .cal-cta:focus-visible { color: #080808; border-color: #FFB3C6; outline: none; }
        .cal-cta:hover::before, .cal-cta:focus-visible::before { transform: scaleX(1); }
        .cal-title a { color: inherit; text-decoration: none; }
        .cal-title a:hover { color: var(--pink-text); }
        .cal-btn, .cal-ghost {
          display: inline-flex; align-items: center; gap: 10px; min-height: 48px; padding: 14px 28px; cursor: pointer;
          font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;
        }
        .cal-btn { background: #FFB3C6; color: #080808; border: 1px solid #FFB3C6; transition: background-color 0.2s; }
        .cal-btn:hover { background: var(--btn-hover); }
        .cal-ghost { background: transparent; color: var(--text); border: 1px solid var(--line-strong); transition: border-color 0.2s, color 0.2s; }
        .cal-ghost:hover { border-color: #FFB3C6; color: var(--pink-text); }
        .cal-skel { display: block; height: 14px; background: var(--surface-2); animation: calPulse 1.2s ease-in-out infinite alternate; }
        @keyframes calPulse { from { opacity: 1; } to { opacity: 0.45; } }
        @media (max-width: 1024px) { .cal-ev { grid-template-columns: 110px 220px minmax(0, 1fr); gap: 24px; } }
        @media (max-width: 700px) {
          .cal-ev { grid-template-columns: 1fr; gap: 16px; padding: 24px 16px; }
          .cal-ev-date { flex-direction: row !important; align-items: baseline !important; flex-wrap: wrap; gap: 12px !important; }
          .cal-mf, .cal-mf-btn { width: 100%; }
          .cal-month__head { padding: 16px; font-size: 22px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cal-thumb img, .cal-mf-btn > svg, .cal-cta, .cal-cta::before { transition: none; }
          .cal-skel { animation: none; }
        }
      `}</style>
    </section>
  )
}

const iconProps = { 'aria-hidden': true, width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--pink-text)', strokeWidth: 2, strokeLinecap: 'square' } as const

function EventRow({ event: e, today }: { event: EventCard; today: string }) {
  const past = isPast(e, today)
  const multi = isMultiDay(e)
  const href = `/kalendorius/${e.slug}`
  const time = timeText(e)
  const price = priceText(e.price)
  const label = { fontWeight: 400, color: 'var(--muted)' }
  const small = { fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase' } as const
  return (
    <article className="cal-ev">
      <div className="cal-ev-date" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: display, fontWeight: 900, fontSize: 80, lineHeight: 0.82, color: 'var(--pink-text)', letterSpacing: -1 }}>{dayOf(e.startDate)}</span>
        <span style={{ fontFamily: display, fontWeight: 800, fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text)' }}>{monthShort(e.startDate)} {yearOf(e.startDate)}</span>
        {multi
          ? <span style={{ fontFamily: display, fontWeight: 800, fontSize: 20, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--pink-text)' }}>→ {dayOf(e.endDate!)} {monthShort(e.endDate!)}</span>
          : <span style={{ fontSize: 13, color: 'var(--muted)' }}>{weekdayOf(e.startDate)}</span>}
      </div>
      <a className="cal-thumb" href={href} aria-label={e.title}>
        {e.cover.src && <img src={e.cover.src} alt="" className={past ? 'is-past' : undefined} loading="lazy" />}
      </a>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px 16px', flexWrap: 'wrap' }}>
          <span className={`ev-tag ev-tag--${e.type}`}>{e.typeLabel}</span>
          {multi && <span className="cal-chip">Kelių dienų</span>}
          {time && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: display, fontWeight: 800, fontSize: 20, letterSpacing: 1, color: 'var(--pink-text)' }}>
              <svg {...iconProps} stroke="currentColor"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>{time}
            </span>
          )}
          {!past && isOngoing(e, today) && <span style={{ ...small, color: 'var(--pink-text)' }}>● Vyksta dabar</span>}
          {past && <span style={{ ...small, color: 'var(--muted)' }}>Įvyko</span>}
        </div>
        <h3 className="cal-title" style={{ margin: 0, fontFamily: display, fontWeight: 900, fontSize: 34, lineHeight: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text)', overflowWrap: 'anywhere' }}>
          <a href={href}>{e.title}</a>
        </h3>
        {e.excerpt && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, fontWeight: 300, color: 'var(--c-a8a8a8)', maxWidth: 620 }}>{e.excerpt}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--text-2)' }}>
          {e.organizer && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
              <span style={label}>Organizatorius:</span> <strong style={{ fontWeight: 600, color: 'var(--text)' }}>{e.organizer.name}</strong>
            </span>
          )}
          {e.venue && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg {...iconProps}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
              <span style={label}>Vieta:</span> <strong style={{ fontWeight: 600, color: 'var(--text)' }}>{e.venue.name}</strong>
            </span>
          )}
          {price && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg {...iconProps}><path d="M17 6.5A6 6 0 0 0 7 9v6a6 6 0 0 0 10 2.5M4 10.5h9M4 13.5h9" /></svg>
              <span style={label}>Kaina:</span> <strong style={{ fontWeight: 600, color: 'var(--text)' }}>{price}</strong>
            </span>
          )}
        </div>
        <a className="cal-cta" href={href}><span>Plačiau apie renginį</span><span aria-hidden="true">→</span></a>
      </div>
    </article>
  )
}
