import { useCallback, useEffect, useRef, useState } from 'react'
import { inlineData } from './content'
import type { Post, PostCard } from './content/types'
import NotFound from './NotFound'
import { fetchPost, formatDate, NotFoundError } from './publicApi'
import { PATHS } from './router'
import { withSiteName } from './seo'

const display = "'Barlow Condensed', sans-serif"

// The post the server rendered comes inline; posts opened from the news list are fetched.
let inlinePost: Post | null = inlineData.view?.type === 'post' ? inlineData.view.post : null
let inlineMissing: string | null = inlineData.view?.type === 'notfound' ? inlineData.view.path : null

type State = { status: 'loading' | 'ready' | 'missing' | 'error'; post?: Post }

export default function PostPage({ slug }: { slug: string }) {
  const [state, setState] = useState<State>(() => initial(slug))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const first = initial(slug)
    inlinePost = null
    inlineMissing = null
    if (first.status !== 'loading') {
      setState(first)
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    fetchPost(slug)
      .then(post => { if (!cancelled) setState({ status: 'ready', post }) })
      .catch(err => { if (!cancelled) setState({ status: err instanceof NotFoundError ? 'missing' : 'error' }) })
    return () => { cancelled = true }
  }, [slug, attempt])

  useEffect(() => {
    if (state.post) document.title = withSiteName(state.post.title)
  }, [state.post])

  if (state.status === 'missing') return <NotFound />
  if (state.status === 'error') {
    return (
      <section style={{ padding: '168px 24px 120px', maxWidth: 1280, margin: '0 auto' }}>
        <div role="alert" style={{ border: '1px solid var(--line)', padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)' }}>Nepavyko įkelti naujienos. Patikrinkite interneto ryšį ir bandykite dar kartą.</p>
          <button type="button" className="news-btn" onClick={() => setAttempt(a => a + 1)} style={{ background: '#FFB3C6', color: '#080808', border: 'none', padding: '14px 28px', fontWeight: 800, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>
            Bandyti dar kartą
          </button>
        </div>
      </section>
    )
  }
  if (state.status === 'loading' || !state.post) {
    return (
      <section aria-busy="true" aria-label="Kraunama naujiena" style={{ padding: '168px 24px 120px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ height: 14, width: 160, background: 'var(--surface-2)', marginBottom: 24 }} />
        <div style={{ height: 64, width: '70%', background: 'var(--surface-2)', marginBottom: 40 }} />
        <div style={{ aspectRatio: '21 / 9', background: 'var(--surface-2)' }} />
      </section>
    )
  }
  return <PostView post={state.post} />
}

function initial(slug: string): State {
  if (inlinePost && inlinePost.slug === slug) return { status: 'ready', post: inlinePost }
  if (inlineMissing && inlineMissing === `/${slug}`) return { status: 'missing' }
  return { status: 'loading' }
}

// The article itself; the admin uses it for the draft preview too (preview: less top space, inert links).
export function PostView({ post, preview = false }: { post: Pick<Post, 'title' | 'cover' | 'bodyHtml' | 'publishedAt' | 'nearby'>; preview?: boolean }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null)

  // Pictures in the text open in a lightbox (gallery pictures can be paged through).
  const imagesAround = useCallback((img: HTMLImageElement) => {
    const group = img.closest('.gallery')
    const list = group ? Array.from(group.querySelectorAll('img')) : [img]
    return { images: list.map(i => ({ src: i.currentSrc || i.src, alt: i.alt })), index: Math.max(0, list.indexOf(img)) }
  }, [])
  useEffect(() => {
    if (preview) return
    bodyRef.current?.querySelectorAll('img').forEach(img => {
      if (img.closest('a')) return
      img.setAttribute('tabindex', '0')
      img.setAttribute('role', 'button')
      img.setAttribute('aria-label', img.alt ? `Didinti nuotrauką: ${img.alt}` : 'Didinti nuotrauką')
    })
  }, [post.bodyHtml, preview])
  const openFrom = (target: EventTarget | null) => {
    const img = (target as HTMLElement | null)?.closest?.('img')
    if (!img || preview || img.closest('a') || !bodyRef.current?.contains(img)) return false
    setLightbox(imagesAround(img))
    return true
  }

  return (
    <article className="post" style={{ padding: preview ? '48px 0 64px' : '168px 0 120px', backgroundColor: 'var(--bg)' }} inert={preview || undefined}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <a href={PATHS.news} className="post-back">← Visos naujienos</a>
        <header style={{ margin: '32px 0 48px', maxWidth: 960 }}>
          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', margin: '0 0 16px' }}>
            ◆&nbsp;&nbsp;{post.publishedAt ? <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> : 'Juodraštis'}
          </p>
          <h1 style={{ fontFamily: display, fontWeight: 900, fontSize: 'clamp(40px, 5.5vw, 80px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: 0, overflowWrap: 'anywhere' }}>
            {post.title}
          </h1>
        </header>
        {post.cover.src && (
          <figure style={{ margin: '0 0 56px', backgroundColor: 'var(--surface-2)' }}>
            <img src={post.cover.src} alt={post.cover.alt} style={{ display: 'block', width: '100%', maxHeight: 620, objectFit: 'cover' }} />
          </figure>
        )}
        <div
          ref={bodyRef} className="post-body" dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
          onClick={e => { openFrom(e.target) }}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && openFrom(e.target)) e.preventDefault() }}
        />
        {lightbox && <Lightbox images={lightbox.images} start={lightbox.index} onClose={() => setLightbox(null)} />}
        <Nearby nearby={post.nearby} />
        <div style={{ maxWidth: 760, marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <a href={PATHS.news} className="post-back">← Visos naujienos</a>
          <a href={PATHS.registration} className="post-cta">Registruotis →</a>
        </div>
      </div>
      <style>{`
        .post-back { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-2); text-decoration: none; transition: color 0.2s; }
        .post-back:hover { color: var(--pink-text); }
        .post-cta {
          background: #FFB3C6; color: #080808; text-decoration: none; padding: 14px 32px;
          font-weight: 800; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; transition: background-color 0.2s;
        }
        .post-cta:hover { background: var(--btn-hover); }
        .post-nearby { margin-top: 72px; }
        .post-step { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 760px; margin-bottom: 56px; }
        .post-step a { display: flex; flex-direction: column; gap: 8px; padding: 20px 24px; border: 1px solid var(--line); text-decoration: none; color: var(--text); transition: border-color 0.2s; }
        .post-step a:hover, .post-step a:focus-visible { border-color: #FFB3C6; outline: none; }
        .post-step a:last-child:not(:first-child) { text-align: right; }
        .post-step small { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--pink-text); }
        .post-step span { font-family: ${display}; font-weight: 900; font-size: 22px; line-height: 1.1; text-transform: uppercase; }
        .post-more-title { font-family: ${display}; font-weight: 900; font-size: 32px; text-transform: uppercase; color: var(--text); margin: 0 0 24px; }
        .post-more { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
        .post-more a { display: flex; flex-direction: column; text-decoration: none; color: inherit; background: var(--surface); border: 1px solid var(--line); transition: border-color 0.2s; }
        .post-more a:hover, .post-more a:focus-visible { border-color: #FFB3C6; outline: none; }
        .post-more__img { aspect-ratio: 16 / 10; background: var(--surface-2); overflow: hidden; }
        .post-more__img img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .post-more__body { display: flex; flex-direction: column; gap: 8px; padding: 16px 20px 20px; }
        .post-more time { font-family: ${display}; font-weight: 700; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--pink-text); }
        .post-more h3 { margin: 0; font-family: ${display}; font-weight: 900; font-size: 22px; line-height: 1.05; text-transform: uppercase; color: var(--text); }
        @media (max-width: 1024px) { .post-more { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .post-step { grid-template-columns: 1fr; } .post-step a:last-child:not(:first-child) { text-align: left; } }
        .post-body { font-size: 18px; line-height: 1.75; font-weight: 300; color: var(--c-cccccc); overflow-wrap: break-word; }
        .post-body > :first-child { margin-top: 0; }
        /* text keeps a comfortable reading width; videos and galleries use the full width (up to 1200px) */
        .post-body > :not(.yt-embed):not(.gallery) { max-width: 760px; }
        .post-body .yt-embed { position: relative; width: 100%; max-width: 1200px; aspect-ratio: 16 / 9; margin: 48px 0; background: #000; }
        .post-body .yt-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .post-body .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 12px; max-width: 1200px; margin: 48px 0; overflow: hidden; }
        .post-body .gallery img { margin: 0; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; transition: filter 300ms; }
        .post-body .gallery img:hover { filter: brightness(1.08); }
        .post-body img[role="button"] { cursor: zoom-in; }
        .post-body img[role="button"]:focus-visible { outline: 3px solid #FFB3C6; outline-offset: 2px; }
        .post-body p { margin: 0 0 24px; }
        .post-body h2, .post-body h3 { font-family: ${display}; font-weight: 900; text-transform: uppercase; color: var(--text); line-height: 1; letter-spacing: 0.5px; }
        .post-body h2 { font-size: 40px; margin: 56px 0 20px; }
        .post-body h3 { font-size: 28px; margin: 40px 0 16px; }
        .post-body strong { color: var(--text); font-weight: 600; }
        .post-body a { color: var(--pink-text); text-decoration: underline; text-underline-offset: 3px; }
        .post-body a:hover { color: var(--c-ffffff); }
        .post-body ul, .post-body ol { margin: 0 0 24px; padding-left: 24px; }
        .post-body li { margin-bottom: 8px; }
        .post-body li > p { margin: 0; }
        .post-body ul li::marker { color: var(--pink-text); }
        .post-body blockquote {
          margin: 40px 0; padding: 4px 0 4px 28px; border-left: 4px solid #FFB3C6;
          font-family: ${display}; font-weight: 700; font-size: 28px; line-height: 1.2; color: var(--text); text-transform: uppercase;
        }
        .post-body blockquote p { margin: 0; }
        .post-body img { display: block; max-width: 100%; height: auto; margin: 40px 0; }
        .post-body hr { border: none; border-top: 1px solid var(--line); margin: 48px 0; }
        @media (max-width: 640px) {
          .post-body { font-size: 17px; }
          .post-body h2 { font-size: 32px; }
          .post-body blockquote { font-size: 22px; }
        }
      `}</style>
    </article>
  )
}

// Newer / older post and the latest others: every article links to more articles.
function Nearby({ nearby }: { nearby?: Post['nearby'] }) {
  if (!nearby) return null
  const { newer, older, more } = nearby
  if (!newer && !older && more.length === 0) return null
  return (
    <nav className="post-nearby" aria-label="Kitos naujienos">
      {(newer || older) && (
        <div className="post-step">
          {newer && <a href={`/${newer.slug}`}><small>← Naujesnė</small><span>{newer.title}</span></a>}
          {older && <a href={`/${older.slug}`}><small>Senesnė →</small><span>{older.title}</span></a>}
        </div>
      )}
      {more.length > 0 && (
        <>
          <h2 className="post-more-title">Kitos naujienos</h2>
          <div className="post-more">
            {more.map((p: PostCard) => (
              <a key={p.slug} href={`/${p.slug}`}>
                <div className="post-more__img">{p.cover.src && <img src={p.cover.src} alt={p.cover.alt} loading="lazy" />}</div>
                <div className="post-more__body">
                  {p.publishedAt && <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time>}
                  <h3>{p.title}</h3>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </nav>
  )
}

// --- lightbox -----------------------------------------------------------------------------------

type LightboxImage = { src: string; alt: string }

function Lightbox({ images, start, onClose }: { images: LightboxImage[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const touchX = useRef<number | null>(null)
  const many = images.length > 1
  const step = useCallback((d: number) => setIndex(i => (i + d + images.length) % images.length), [images.length])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Tab') { e.preventDefault(); closeBtn.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [onClose, step])

  const image = images[index]
  return (
    <div
      className="lb" role="dialog" aria-modal="true" aria-label="Nuotraukų peržiūra"
      onClick={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('lb__stage')) onClose() }}
      onTouchStart={e => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchX.current === null || !many) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
      }}
    >
      <div className="lb__stage">
        <img key={image.src} className="lb__img" src={image.src} alt={image.alt} />
      </div>
      {image.alt && <p className="lb__caption">{image.alt}</p>}
      <button ref={closeBtn} type="button" className="lb__btn lb__close" aria-label="Uždaryti" onClick={onClose}>×</button>
      {many && (
        <>
          <button type="button" className="lb__btn lb__prev" aria-label="Ankstesnė nuotrauka" onClick={() => step(-1)}>←</button>
          <button type="button" className="lb__btn lb__next" aria-label="Kita nuotrauka" onClick={() => step(1)}>→</button>
          <span className="lb__count" aria-live="polite">{index + 1} / {images.length}</span>
        </>
      )}
      <style>{`
        .lb { position: fixed; inset: 0; z-index: 1000; background: rgba(8, 8, 8, 0.94); display: flex; flex-direction: column; align-items: center; justify-content: center; animation: lbIn 200ms ease-out; }
        .lb__stage { flex: 1; width: 100%; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 64px 72px 8px; }
        .lb__img { max-width: 100%; max-height: 100%; object-fit: contain; animation: lbImg 260ms cubic-bezier(0.23, 1, 0.32, 1); }
        .lb__caption { margin: 0; padding: 8px 72px 56px; max-width: 900px; text-align: center; font-size: 15px; line-height: 1.5; color: #ccc; }
        .lb__btn {
          position: absolute; width: 48px; height: 48px; display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255, 255, 255, 0.08); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); cursor: pointer;
          font-size: 24px; line-height: 1; transition: background-color 0.2s, color 0.2s;
        }
        .lb__btn:hover, .lb__btn:focus-visible { background: #FFB3C6; color: #080808; outline: none; }
        .lb__close { top: 16px; right: 16px; font-size: 30px; }
        .lb__prev { left: 16px; top: 50%; transform: translateY(-50%); }
        .lb__next { right: 16px; top: 50%; transform: translateY(-50%); }
        .lb__count { position: absolute; top: 28px; left: 24px; font-size: 13px; font-weight: 700; letter-spacing: 3px; color: #ccc; }
        @keyframes lbIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lbImg { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: none; } }
        @media (max-width: 640px) {
          .lb__stage { padding: 64px 8px 8px; }
          .lb__caption { padding: 8px 16px 24px; }
          .lb__prev, .lb__next { top: auto; bottom: 16px; transform: none; }
          .lb__prev { left: 16px; } .lb__next { right: 16px; }
        }
        @media (prefers-reduced-motion: reduce) { .lb, .lb__img { animation: none; } }
      `}</style>
    </div>
  )
}
