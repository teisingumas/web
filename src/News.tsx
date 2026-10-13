import { useEffect, useRef, useState } from 'react'
import { inlineData, section } from './content'
import type { PostPage } from './content/types'
import { fetchNewsPage, formatDate } from './publicApi'
import { newsPagePath, PATHS } from './router'
import { pageTitle } from './seo'

const display = "'Barlow Condensed', sans-serif"

// The page the server rendered comes inline; later pages are fetched.
let inlinePage: PostPage | null = inlineData.view?.type === 'news' ? inlineData.view.data : null

export default function News({ pageNum: routePage }: { pageNum: number }) {
  const news = section('news')
  // The page number lives in state, not in the address: the pager swaps the six posts in place
  // and the address stays /naujienos. /naujienos/N still opens that page (old links, crawlers).
  const [pageNum, setPageNum] = useState(routePage)
  const listTop = useRef<HTMLDivElement>(null)
  useEffect(() => { setPageNum(routePage) }, [routePage])
  const goToPage = (n: number) => {
    setPageNum(n)
    if (window.location.pathname !== PATHS.news) {
      try { window.history.replaceState(null, '', PATHS.news) } catch { /* preview frames */ }
    }
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; data?: PostPage; page: number }>(() =>
    inlinePage && inlinePage.page === pageNum ? { status: 'ready', data: inlinePage, page: pageNum } : { status: 'loading', page: pageNum },
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const title = pageTitle('naujienos')
    document.title = pageNum > 1 ? `${title} · ${pageNum} psl.` : title
  }, [pageNum])

  useEffect(() => {
    if (inlinePage && inlinePage.page === pageNum) {
      setState({ status: 'ready', data: inlinePage, page: pageNum })
      inlinePage = null
      return
    }
    let cancelled = false
    setState(s => ({ status: 'loading', data: s.data, page: pageNum }))
    fetchNewsPage(pageNum)
      .then(data => { if (!cancelled) setState({ status: 'ready', data, page: pageNum }) })
      .catch(() => { if (!cancelled) setState({ status: 'error', page: pageNum }) })
    return () => { cancelled = true }
  }, [pageNum, attempt])

  const data = state.status === 'ready' ? state.data : undefined
  const outOfRange = data && data.total > 0 && pageNum > data.pages

  return (
    <section id="naujienos" style={{ padding: '168px 0 120px', backgroundColor: 'var(--bg)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', marginBottom: 12 }}>
            ◆&nbsp;&nbsp;{news.kicker}
          </p>
          <h1 style={{ fontFamily: display, fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: 0 }}>
            {news.title}
          </h1>
          {news.intro && (
            <p style={{ marginTop: 24, marginBottom: 0, fontSize: 17, color: 'var(--c-b0b0b0)', lineHeight: 1.6, maxWidth: 560, fontWeight: 300 }}>{news.intro}</p>
          )}
        </div>

        {state.status === 'loading' && (
          <div className="news-grid" aria-busy="true" aria-label="Kraunamos naujienos">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="news-card news-card--skeleton" aria-hidden="true">
                <div className="news-card__img" />
                <div className="news-card__body">
                  <span className="news-skel" style={{ width: '40%' }} />
                  <span className="news-skel" style={{ width: '85%', height: 22 }} />
                  <span className="news-skel" style={{ width: '100%' }} />
                  <span className="news-skel" style={{ width: '70%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" style={{ border: '1px solid var(--line)', padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)' }}>Nepavyko įkelti naujienų. Patikrinkite interneto ryšį ir bandykite dar kartą.</p>
            <button type="button" className="news-btn" onClick={() => setAttempt(a => a + 1)}>Bandyti dar kartą</button>
          </div>
        )}

        {data && data.total === 0 && (
          <p style={{ margin: 0, padding: '32px 24px', border: '1px solid var(--line)', fontSize: 15, color: 'var(--text-2)' }}>{news.emptyText}</p>
        )}

        {outOfRange && (
          <p style={{ margin: 0, padding: '32px 24px', border: '1px solid var(--line)', fontSize: 15, color: 'var(--text-2)' }}>
            Tokio puslapio nėra. <a href={newsPagePath(1)} className="news-inline-link">Grįžti į naujienas</a>
          </p>
        )}

        {data && data.items.length > 0 && (
          <>
            <div ref={listTop} className="news-list-top" />
            <div className="news-grid">
              {data.items.map(post => (
                <a key={post.slug} href={`/${post.slug}`} className="news-card">
                  <div className="news-card__img">
                    {post.cover.src && <img src={post.cover.src} alt={post.cover.alt} loading="lazy" />}
                  </div>
                  <div className="news-card__body">
                    {post.publishedAt && <time className="news-card__date" dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>}
                    <h2 className="news-card__title">{post.title}</h2>
                    {post.excerpt && <p className="news-card__excerpt">{post.excerpt}</p>}
                    <span className="news-card__more">Skaityti →</span>
                  </div>
                </a>
              ))}
            </div>
            {data.pages > 1 && <Pagination page={pageNum} pages={data.pages} onChange={goToPage} />}
          </>
        )}
      </div>

      <style>{`
        .news-list-top { scroll-margin-top: 120px; }
        .news-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
        .news-card {
          display: flex; flex-direction: column; text-decoration: none; color: inherit;
          background: var(--surface); border: 1px solid var(--line);
          transition: transform 260ms cubic-bezier(0.23, 1, 0.32, 1), border-color 260ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .news-card:not(.news-card--skeleton):hover, .news-card:focus-visible { transform: translateY(-4px); border-color: #FFB3C6; outline: none; }
        .news-card__img { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--surface-2); }
        .news-card__img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 500ms ease; }
        .news-card:hover .news-card__img img { transform: scale(1.06); }
        .news-card__body { display: flex; flex-direction: column; gap: 12px; padding: 24px 24px 28px; flex: 1; }
        .news-card__date { font-family: ${display}; font-weight: 700; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--pink-text); }
        .news-card__title { margin: 0; font-family: ${display}; font-weight: 900; font-size: 26px; line-height: 1.05; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text); }
        .news-card__excerpt {
          margin: 0; font-size: 15px; line-height: 1.6; font-weight: 300; color: var(--c-a8a8a8);
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        .news-card__more { margin-top: auto; padding-top: 8px; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--pink-text); }
        .news-skel { display: block; height: 14px; background: var(--surface-2); animation: newsPulse 1.2s ease-in-out infinite alternate; }
        .news-card--skeleton .news-card__img { animation: newsPulse 1.2s ease-in-out infinite alternate; }
        @keyframes newsPulse { from { opacity: 1; } to { opacity: 0.45; } }
        .news-pages { display: flex; justify-content: center; align-items: center; gap: 4px; margin-top: 56px; flex-wrap: wrap; }
        .news-page {
          min-width: 48px; height: 48px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center;
          font-family: ${display}; font-weight: 800; font-size: 18px; letter-spacing: 1px; text-decoration: none; cursor: pointer;
        }
        .news-page[aria-disabled="true"] { opacity: 0.35; pointer-events: none; }
        /* the current page looks like the active day tab */
        .news-page[aria-current="page"] { color: #080808; border-color: #FFB3C6; }
        .news-page[aria-current="page"]::before { transform: scaleX(1); }
        .news-gap { min-width: 32px; text-align: center; color: var(--muted); font-family: ${display}; font-weight: 800; }
        .news-btn {
          background: #FFB3C6; color: #080808; border: 1px solid #FFB3C6; cursor: pointer; padding: 14px 28px;
          font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;
        }
        .news-btn:hover { background: var(--btn-hover); }
        .news-inline-link { color: var(--pink-text); text-decoration: underline; text-underline-offset: 3px; }
        @media (max-width: 1024px) { .news-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .news-grid { grid-template-columns: 1fr; } }
        @media (prefers-reduced-motion: reduce) {
          .news-card, .news-card__img img { transition: none; }
          .news-skel, .news-card--skeleton .news-card__img { animation: none; }
        }
      `}</style>
    </section>
  )
}

// 1 2 3 … with arrows; long ranges keep the first, last and the pages around the current one.
function pageList(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const around = [page - 1, page, page + 1].filter(n => n > 1 && n < pages)
  const list: (number | 'gap')[] = [1]
  if (around[0] > 2) list.push('gap')
  list.push(...around)
  if (around[around.length - 1] < pages - 1) list.push('gap')
  list.push(pages)
  return list
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (n: number) => void }) {
  return (
    <nav className="news-pages" aria-label="Naujienų puslapiai">
      <button type="button" className="news-page day-tab" disabled={page <= 1} aria-disabled={page <= 1} aria-label="Ankstesnis puslapis" onClick={() => onChange(page - 1)}><span>←</span></button>
      {pageList(page, pages).map((n, i) =>
        n === 'gap' ? <span key={`gap-${i}`} className="news-gap" aria-hidden="true">…</span> : (
          <button key={n} type="button" className="news-page day-tab" aria-current={n === page ? 'page' : undefined} aria-label={`${n} puslapis`} onClick={() => n !== page && onChange(n)}>
            <span>{n}</span>
          </button>
        ),
      )}
      <button type="button" className="news-page day-tab" disabled={page >= pages} aria-disabled={page >= pages} aria-label="Kitas puslapis" onClick={() => onChange(page + 1)}><span>→</span></button>
    </nav>
  )
}
