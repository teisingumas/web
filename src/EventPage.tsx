import { useEffect, useState } from 'react'
import { inlineData } from './content'
import type { EventDetail } from './content/types'
import { dayOf, isPast, isMultiDay, longDate, mapEmbedUrl, mapLinkUrl, monthShort, priceText, timeText, weekdayOf, whenText, yearOf } from './eventFormat'
import NotFound from './NotFound'
import { PostBody } from './PostPage'
import { fetchEvent, NotFoundError } from './publicApi'
import { PATHS } from './router'
import { withSiteName } from './seo'

const display = "'Barlow Condensed', sans-serif"

// The event the server rendered comes inline; events opened from the calendar are fetched.
let inlineEvent: EventDetail | null = inlineData.view?.type === 'event' ? inlineData.view.event : null
let inlineMissing: string | null = inlineData.view?.type === 'notfound' ? inlineData.view.path : null

type State = { status: 'loading' | 'ready' | 'missing' | 'error'; event?: EventDetail }

export default function EventPage({ slug }: { slug: string }) {
  const [state, setState] = useState<State>(() => initial(slug))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const first = initial(slug)
    inlineEvent = null
    inlineMissing = null
    if (first.status !== 'loading') {
      setState(first)
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    fetchEvent(slug)
      .then(event => {
        if (cancelled) return
        // opened through an old address: show the current one
        if (event.slug !== slug) { try { window.history.replaceState(null, '', `${PATHS.calendar}/${event.slug}`) } catch { /* preview frames */ } }
        setState({ status: 'ready', event })
      })
      .catch(err => { if (!cancelled) setState({ status: err instanceof NotFoundError ? 'missing' : 'error' }) })
    return () => { cancelled = true }
  }, [slug, attempt])

  useEffect(() => {
    if (state.event) document.title = withSiteName(state.event.title)
  }, [state.event])

  if (state.status === 'missing') return <NotFound />
  if (state.status === 'error') {
    return (
      <section style={{ padding: '168px 24px 120px', maxWidth: 1280, margin: '0 auto' }}>
        <div role="alert" style={{ border: '1px solid var(--line)', padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)' }}>Nepavyko įkelti renginio. Patikrinkite interneto ryšį ir bandykite dar kartą.</p>
          <button type="button" onClick={() => setAttempt(a => a + 1)} style={{ background: '#FFB3C6', color: '#080808', border: 'none', padding: '14px 28px', fontWeight: 800, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>
            Bandyti dar kartą
          </button>
        </div>
      </section>
    )
  }
  if (state.status === 'loading' || !state.event) {
    return (
      <section aria-busy="true" aria-label="Kraunamas renginys" style={{ padding: '168px 24px 120px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ height: 14, width: 160, background: 'var(--surface-2)', marginBottom: 24 }} />
        <div style={{ height: 64, width: '70%', background: 'var(--surface-2)', marginBottom: 40 }} />
        <div style={{ aspectRatio: '21 / 9', background: 'var(--surface-2)' }} />
      </section>
    )
  }
  return <EventView event={state.event} />
}

function initial(slug: string): State {
  if (inlineEvent && inlineEvent.slug === slug) return { status: 'ready', event: inlineEvent }
  if (inlineMissing && inlineMissing === `${PATHS.calendar}/${slug}`) return { status: 'missing' }
  return { status: 'loading' }
}

const icon = { 'aria-hidden': true, width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--pink-text)', strokeWidth: 2, strokeLinecap: 'square' } as const

// The event itself; the admin uses it for the draft preview too (preview: less top space, inert links).
export function EventView({ event, preview = false }: { event: Omit<EventDetail, 'slug'>; preview?: boolean }) {
  const past = event.startDate ? isPast(event) : false
  const multi = !!event.startDate && isMultiDay(event)
  const price = priceText(event.price)
  const venue = event.venue
  return (
    <article className="ev" style={{ padding: preview ? '48px 0 64px' : '168px 0 120px', backgroundColor: 'var(--bg)' }} inert={preview || undefined}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <a href={PATHS.calendar} className="ev-back">← Visi renginiai</a>
        <header style={{ margin: '32px 0 48px', maxWidth: 960 }}>
          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', margin: '0 0 16px' }}>
            ◆&nbsp;&nbsp;{event.startDate ? <time dateTime={event.startDate}>{longDate(event.startDate)}</time> : 'Renginys'}{past && ' · Įvyko'}
          </p>
          <h1 style={{ fontFamily: display, fontWeight: 900, fontSize: 'clamp(40px, 5.5vw, 80px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: 0, overflowWrap: 'anywhere' }}>
            {event.title}
          </h1>
        </header>
        {event.cover.src && (
          <figure style={{ margin: '0 0 56px', backgroundColor: 'var(--surface-2)' }}>
            <img src={event.cover.src} alt={event.cover.alt} style={{ display: 'block', width: '100%', maxHeight: 620, objectFit: 'cover', ...(past ? { filter: 'grayscale(1)', opacity: 0.7 } : {}) }} />
          </figure>
        )}

        <div className="ev-layout">
          <aside className="ev-info" aria-label="Renginio informacija">
            {event.startDate && (
              <div className="ev-info__date">
                <span className="ev-info__day">{dayOf(event.startDate)}</span>
                <span className="ev-info__month">{monthShort(event.startDate)} {yearOf(event.startDate)}</span>
                {multi && <span className="ev-info__month" style={{ color: 'var(--pink-text)' }}>→ {dayOf(event.endDate!)} {monthShort(event.endDate!)}</span>}
              </div>
            )}
            <dl className="ev-facts">
              {event.startDate && (
                <div>
                  <svg {...icon}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  <dt>Kada</dt>
                  <dd>{whenText(event)}</dd>
                </div>
              )}
              {venue && (
                <div>
                  <svg {...icon}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
                  <dt>Vieta</dt>
                  <dd>{venue.name}{venue.address && <span className="ev-facts__sub">{venue.address}</span>}</dd>
                </div>
              )}
              {event.organizer && (
                <div>
                  <svg {...icon}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
                  <dt>Organizatorius</dt>
                  <dd>{event.organizer.website
                    ? <a href={event.organizer.website} target="_blank" rel="noopener noreferrer">{event.organizer.name}</a>
                    : event.organizer.name}</dd>
                </div>
              )}
              {price && (
                <div>
                  <svg {...icon}><path d="M17 6.5A6 6 0 0 0 7 9v6a6 6 0 0 0 10 2.5M4 10.5h9M4 13.5h9" /></svg>
                  <dt>Kaina</dt>
                  <dd>{price}</dd>
                </div>
              )}
            </dl>
            {venue && event.showMap && <a className="ev-maplink" href={mapLinkUrl(venue)} target="_blank" rel="noopener noreferrer">Atidaryti žemėlapyje ↗</a>}
          </aside>

          <div className="ev-main">
            {event.excerpt && <p className="ev-lead">{event.excerpt}</p>}
            <PostBody html={event.bodyHtml} preview={preview} />
          </div>
        </div>

        {venue && event.showMap && (
          <div className="ev-map">
            <iframe
              title={`Žemėlapis: ${venue.name}`} src={mapEmbedUrl(venue)} loading="lazy" allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )}

        {event.more && event.more.length > 0 && (
          <nav className="ev-nearby" aria-label="Kiti renginiai">
            <h2 className="ev-nearby__title">Kiti renginiai</h2>
            <div className="ev-more">
              {event.more.map(m => (
                <a key={m.slug} href={`${PATHS.calendar}/${m.slug}`}>
                  <div className="ev-more__img">{m.cover.src && <img src={m.cover.src} alt={m.cover.alt} loading="lazy" />}</div>
                  <div className="ev-more__body">
                    <time dateTime={m.startDate}>{dayOf(m.startDate)} {monthShort(m.startDate)} · {timeText(m) || weekdayOf(m.startDate)}</time>
                    <h3>{m.title}</h3>
                  </div>
                </a>
              ))}
            </div>
          </nav>
        )}

        <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <a href={PATHS.calendar} className="ev-back">← Visi renginiai</a>
          <a href={PATHS.registration} className="ev-cta">Registruotis →</a>
        </div>
      </div>
      <style>{`
        .ev-back { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-2); text-decoration: none; transition: color 0.2s; }
        .ev-back:hover { color: var(--pink-text); }
        .ev-cta {
          background: #FFB3C6; color: #080808; text-decoration: none; padding: 14px 32px;
          font-weight: 800; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; transition: background-color 0.2s;
        }
        .ev-cta:hover { background: var(--btn-hover); }
        .ev-layout { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 64px; align-items: start; }
        .ev-info { position: sticky; top: 112px; background: var(--surface); border: 1px solid var(--line); padding: 32px 28px; display: flex; flex-direction: column; gap: 28px; }
        .ev-info__date { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
        .ev-info__day { font-family: ${display}; font-weight: 900; font-size: 88px; line-height: 0.8; color: var(--pink-text); letter-spacing: -1px; }
        .ev-info__month { font-family: ${display}; font-weight: 800; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; color: var(--text); padding-bottom: 2px; }
        .ev-facts { margin: 0; display: flex; flex-direction: column; gap: 20px; }
        .ev-facts > div { display: grid; grid-template-columns: 20px minmax(0, 1fr); column-gap: 14px; row-gap: 2px; }
        .ev-facts svg { grid-row: 1 / span 2; margin-top: 2px; }
        .ev-facts dt { font-family: ${display}; font-weight: 700; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); }
        .ev-facts dd { margin: 0; font-size: 16px; line-height: 1.5; color: var(--text); font-weight: 500; overflow-wrap: anywhere; }
        .ev-facts dd a { color: var(--pink-text); text-decoration: underline; text-underline-offset: 3px; }
        .ev-facts__sub { display: block; font-weight: 300; color: var(--text-2); font-size: 14px; }
        .ev-maplink { align-self: flex-start; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--pink-text); text-decoration: none; }
        .ev-maplink:hover { color: var(--text); }
        .ev-lead { margin: 0 0 32px; max-width: 760px; font-size: 21px; line-height: 1.6; font-weight: 300; color: var(--text); }
        .ev-map { margin-top: 64px; aspect-ratio: 16 / 7; min-height: 320px; background: var(--surface-2); border: 1px solid var(--line); }
        .ev-map iframe { display: block; width: 100%; height: 100%; border: 0; }
        .ev-nearby { margin-top: 72px; }
        .ev-nearby__title { font-family: ${display}; font-weight: 900; font-size: 32px; text-transform: uppercase; color: var(--text); margin: 0 0 24px; }
        .ev-more { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
        .ev-more a { display: flex; flex-direction: column; text-decoration: none; color: inherit; background: var(--surface); border: 1px solid var(--line); transition: border-color 0.2s; }
        .ev-more a:hover, .ev-more a:focus-visible { border-color: #FFB3C6; outline: none; }
        .ev-more__img { aspect-ratio: 16 / 10; background: var(--surface-2); overflow: hidden; }
        .ev-more__img img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ev-more__body { display: flex; flex-direction: column; gap: 8px; padding: 16px 20px 20px; }
        .ev-more time { font-family: ${display}; font-weight: 700; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--pink-text); }
        .ev-more h3 { margin: 0; font-family: ${display}; font-weight: 900; font-size: 22px; line-height: 1.05; text-transform: uppercase; color: var(--text); }
        @media (max-width: 1024px) {
          .ev-layout { grid-template-columns: 1fr; gap: 40px; }
          .ev-info { position: static; }
          .ev-more { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) { .ev-lead { font-size: 18px; } .ev-info__day { font-size: 72px; } }
      `}</style>
    </article>
  )
}
