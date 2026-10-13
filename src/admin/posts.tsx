import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Img } from '../content/types'
import { PostView } from '../PostPage'
import { navigate, SLUG_RE } from '../router'
import { ApiError, type AdminPost, type PostList, type PostInput } from './api'
import { Modal, useApi, useConfirm, useDirty, useToast } from './context'
import { Counter, setIn, type PathArr } from './fields'
import { SectionCard, SeoCard, SerpPreview, stableJson } from './FormCard'
import ImageInput from './ImageInput'
import { ADMIN } from './pages'
import RichEditor from './RichEditor'
import { htmlText, SCHEMA, type Errors, type ImageField } from './schema'
import { ErrorState, formatDateTime, PageHeader, Skeleton, Spinner, Tabs } from './ui'

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120).replace(/-+$/, '')
}

const statusKey = (p: Pick<AdminPost, 'status' | 'scheduled'>) => (p.scheduled ? 'scheduled' : p.status)
const statusLabel = (p: Pick<AdminPost, 'status' | 'scheduled'>) => ({ published: 'Publikuota', draft: 'Juodraštis', scheduled: 'Suplanuota' })[statusKey(p)]

// Publishing times are typed in Lithuanian time whatever the browser's time zone is.
const TZ = 'Europe/Vilnius'
const tzParts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
const partsOf = (ms: number) => Object.fromEntries(tzParts.formatToParts(new Date(ms)).map(p => [p.type, p.value])) as Record<string, string>

/** ISO instant to "YYYY-MM-DDTHH:MM" in Lithuanian time. */
export function toVilniusLocal(iso: string | null | undefined) {
  const ms = iso ? new Date(iso).getTime() : NaN
  if (Number.isNaN(ms)) return ''
  const p = partsOf(ms)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/** "YYYY-MM-DDTHH:MM" in Lithuanian time to the instant it names. */
export function fromVilniusLocal(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) return null
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
  const offset = (t: number) => { const p = partsOf(t); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - t }
  let t = asUtc - offset(asUtc)
  t = asUtc - offset(t)
  return new Date(t)
}

// --- /apzvalga/naujienos ----------------------------------------------------------------------

export function NewsAdmin() {
  const [tab, setTab] = useState<'posts' | 'page' | 'seo'>('posts')
  return (
    <>
      <PageHeader
        kicker="Naujienos" title="Naujienos"
        lead={<>Publikuotos naujienos rodomos puslapyje <a className="adm-link" href="/naujienos" target="_blank" rel="noreferrer">/naujienos</a> (po 6 viename puslapyje), kiekviena turi savo adresą, pvz. <span className="adm-code">/vasaros-stovykla</span>.</>}
        actions={<a href={`${ADMIN}/naujienos/naujas`} className="adm-btn">+ Nauja naujiena</a>}
      />
      <Tabs label="Naujienų skiltys" value={tab} onChange={setTab} tabs={[
        { id: 'posts', label: 'Įrašai' }, { id: 'page', label: 'Puslapio tekstai' }, { id: 'seo', label: 'SEO' },
      ]} />
      <div hidden={tab !== 'posts'}><PostsList /></div>
      <div hidden={tab !== 'page'}><SectionCard sectionKey="news" defaultOpen viewHref="/naujienos" /></div>
      <div hidden={tab !== 'seo'}><SeoCard pageKey="naujienos" path="/naujienos" /></div>
    </>
  )
}

function PostsList() {
  const api = useApi()
  const [status, setStatus] = useState<'' | 'published' | 'draft'>('')
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PostList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const t = window.setTimeout(() => { setQ(query); setPage(1) }, 300)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.posts({ status, q, page })
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [api, status, q, page, attempt])

  const counts = data?.counts
  return (
    <>
      <div className="adm-toolbar">
        <div role="tablist" aria-label="Filtras" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {([['', 'Visos', counts?.all], ['published', 'Publikuotos', counts?.published], ['draft', 'Juodraščiai', counts?.draft]] as const).map(([value, label, n]) => (
            <button key={value} type="button" role="tab" aria-selected={status === value}
              className={`adm-btn adm-btn--small${status === value ? '' : ' adm-btn--ghost'}`}
              onClick={() => { setStatus(value); setPage(1) }}>
              {label}{n !== undefined && ` (${n})`}
            </button>
          ))}
        </div>
        <input className="adm-input" type="search" placeholder="Ieškoti pagal pavadinimą…" aria-label="Ieškoti naujienų" value={query} onChange={e => setQuery(e.target.value)} />
        {loading && data && <Spinner />}
      </div>

      {error ? <ErrorState message={error} onRetry={() => setAttempt(a => a + 1)} />
        : !data ? (
          <div className="adm-table" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="adm-table__row"><Skeleton style={{ height: 45 }} /><Skeleton /><Skeleton /><Skeleton /><span /></div>)}</div>
        ) : data.items.length === 0 ? (
          <div className="adm-state">
            <p>{q || status ? 'Pagal šiuos kriterijus naujienų nerasta.' : 'Naujienų dar nėra. Sukurkite pirmąją!'}</p>
            {!q && !status && <a href={`${ADMIN}/naujienos/naujas`} className="adm-btn adm-btn--small">+ Nauja naujiena</a>}
          </div>
        ) : (
          <div className="adm-table">
            <div className="adm-table__row adm-table__row--head" aria-hidden="true"><span /><span>Pavadinimas</span><span>Būsena</span><span>Atnaujinta</span><span /></div>
            {data.items.map(p => (
              <div key={p.id} className="adm-table__row">
                {p.cover.src ? <img className="adm-table__thumb" src={p.cover.src} alt="" loading="lazy" /> : <span className="adm-table__thumb" aria-hidden="true" />}
                <div style={{ minWidth: 0 }}>
                  <a className="adm-table__title" href={`${ADMIN}/naujienos/${p.id}`}>{p.title || 'Be pavadinimo'}</a>
                  <span className="adm-table__slug">/{p.slug}</span>
                </div>
                <span>
                  <span className={`adm-chip adm-chip--${statusKey(p)}`}>{statusLabel(p)}</span>
                  {p.scheduled && <span className="adm-table__slug">pasirodys {formatDateTime(p.publishedAt)}</span>}
                </span>
                <span className="adm-table__date">{formatDateTime(p.updatedAt)}</span>
                <div className="adm-table__actions">
                  <a className="adm-btn adm-btn--small adm-btn--ghost" href={`${ADMIN}/naujienos/${p.id}`}>Redaguoti</a>
                  {p.status === 'published' && <a className="adm-btn adm-btn--small adm-btn--ghost" href={`/${p.slug}`} target="_blank" rel="noreferrer" aria-label={`Žiūrėti „${p.title}“ svetainėje`}>↗</a>}
                </div>
              </div>
            ))}
          </div>
        )}

      {data && data.pages > 1 && (
        <nav className="adm-pages" aria-label="Puslapiai">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map(n => (
            <button key={n} type="button" className={`adm-btn adm-btn--small${n === data.page ? '' : ' adm-btn--ghost'}`} aria-current={n === data.page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>
          ))}
        </nav>
      )}
    </>
  )
}

// --- /apzvalga/naujienos/naujas, /apzvalga/naujienos/:id -------------------------------------

type Form = {
  title: string; slug: string; excerpt: string; bodyHtml: string; cover: Img
  seoTitle: string; seoDescription: string; seoKeywords: string
  publishedAt: string   // Lithuanian time, '' = automatic (now)
}
const EMPTY: Form = { title: '', slug: '', excerpt: '', bodyHtml: '', cover: { src: '', alt: '' }, seoTitle: '', seoDescription: '', seoKeywords: '', publishedAt: '' }
const COVER_FIELD: ImageField = { key: 'cover', type: 'image', label: 'Viršelio nuotrauka', required: true, help: 'Rodoma naujienų sąraše, naujienos viršuje ir dalinantis Facebook. Geriausia plati, pvz. 1600 × 1000 px.' }

const fromPost = (p: AdminPost): Form => ({
  title: p.title, slug: p.slug, excerpt: p.excerpt, bodyHtml: p.bodyHtml, cover: p.cover,
  seoTitle: p.seoTitle, seoDescription: p.seoDescription, seoKeywords: p.seoKeywords,
  publishedAt: toVilniusLocal(p.publishedAt),
})

function slugProblem(slug: string) {
  if (!slug) return 'Įrašykite adresą.'
  if (!SLUG_RE.test(slug)) return 'Tik mažosios raidės be lietuviškų ženklų, skaičiai ir brūkšneliai, pvz. vasaros-stovykla-2026.'
  if (SCHEMA.reservedSlugs.includes(slug)) return 'Šis adresas skirtas svetainės puslapiui. Pasirinkite kitą.'
  return null
}

function validatePost(f: Form, slugAuto: boolean, publish: boolean): Errors {
  const e: Errors = {}
  const len = (s: string) => s.trim().length
  if (!len(f.title)) e.title = 'Įrašykite pavadinimą.'
  else if (len(f.title) > 160) e.title = `Ne daugiau kaip 160 ženklų (dabar ${len(f.title)}).`
  if (!slugAuto) { const p = slugProblem(f.slug); if (p) e.slug = p }
  if (len(f.excerpt) > 300) e.excerpt = `Ne daugiau kaip 300 ženklų (dabar ${len(f.excerpt)}).`
  if (f.cover.src && len(f.cover.alt) < 3) e['cover.alt'] = 'Trumpai aprašykite, kas nuotraukoje (alt tekstas).'
  if (len(f.seoTitle) > 70) e.seoTitle = `Ne daugiau kaip 70 ženklų (dabar ${len(f.seoTitle)}).`
  if (len(f.seoDescription) > 160) e.seoDescription = `Ne daugiau kaip 160 ženklų (dabar ${len(f.seoDescription)}).`
  if (len(f.seoKeywords) > 255) e.seoKeywords = 'Ne daugiau kaip 255 ženklai.'
  if (publish) {
    if (!len(f.excerpt)) e.excerpt = 'Prieš publikuojant įrašykite trumpą santrauką (ji rodoma naujienų sąraše).'
    if (!htmlText(f.bodyHtml) && !/data-youtube|<img /.test(f.bodyHtml)) e.bodyHtml = 'Prieš publikuojant parašykite naujienos tekstą.'
    if (!f.cover.src) e['cover.src'] = 'Prieš publikuojant įkelkite viršelio nuotrauką.'
  }
  return e
}

export function PostEditor({ id }: { id: number | 'new' }) {
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const [post, setPost] = useState<AdminPost | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [form, setForm] = useState<Form>(EMPTY)
  const [base, setBase] = useState<Form>(EMPTY)
  const [slugAuto, setSlugAuto] = useState(id === 'new')
  const [errors, setErrors] = useState<Errors>({})
  const [tried, setTried] = useState<'draft' | 'published' | null>(null)
  const [saving, setSaving] = useState<'draft' | 'published' | 'delete' | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [slugRemote, setSlugRemote] = useState<string | null>(null)

  // Load the post (a freshly created one is already in state).
  useEffect(() => {
    if (id === 'new') {
      setPost(null); setForm(EMPTY); setBase(EMPTY); setSlugAuto(true)
      return
    }
    if (post?.id === id) return
    let cancelled = false
    setLoadError(null)
    api.post(id)
      .then(p => { if (cancelled) return; setPost(p); setForm(fromPost(p)); setBase(fromPost(p)); setSlugAuto(false) })
      .catch(e => { if (!cancelled) setLoadError(e.message) })
    return () => { cancelled = true }
  }, [api, id, attempt])

  const effective = useMemo(() => (slugAuto ? { ...form, slug: slugify(form.title) } : form), [form, slugAuto])
  const dirty = stableJson(effective) !== stableJson(base) && !(id === 'new' && !form.title && !form.bodyHtml && !form.excerpt && !form.cover.src)
  const markClean = useDirty('post-editor', dirty)

  const set = useCallback((path: PathArr, value: unknown) => {
    setForm(f => setIn(f, path, value))
  }, [])

  // live errors after a failed attempt
  const shownErrors = useMemo(() => (tried ? { ...validatePost(form, slugAuto, tried === 'published'), ...errors } : errors), [tried, form, slugAuto, errors])

  // Is the typed address free? (checked while typing, the server checks again on save)
  useEffect(() => {
    setSlugRemote(null)
    if (slugAuto || slugProblem(form.slug) || form.slug === post?.slug) return
    const t = window.setTimeout(() => {
      api.slugCheck(form.slug, post?.id).then(r => setSlugRemote(r.ok ? null : r.message)).catch(() => {})
    }, 450)
    return () => window.clearTimeout(t)
  }, [api, form.slug, slugAuto, post?.id, post?.slug])

  const status = post?.status ?? 'draft'
  const isPublished = status === 'published'
  const chosenAt = form.publishedAt ? fromVilniusLocal(form.publishedAt) : null
  const willSchedule = !!chosenAt && chosenAt.getTime() > Date.now()
  const isScheduled = !!post?.scheduled
  const dateLabel = formatDateTime(chosenAt?.toISOString())

  const focusFirstError = () => window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>('.adm-post [aria-invalid="true"]')
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el?.focus({ preventScroll: true })
  }, 50)

  const save = async (next: 'draft' | 'published') => {
    const found = validatePost(form, slugAuto, next === 'published')
    if (Object.keys(found).length) {
      setTried(next)
      setErrors({})
      toast.error(next === 'published' ? 'Kad publikuotumėte, užpildykite pažymėtus laukus.' : 'Patikrinkite pažymėtus laukus.')
      focusFirstError()
      return
    }
    if (isPublished && !isScheduled && post && !slugAuto && form.slug !== post.slug) {
      const ok = await confirm({
        title: 'Pakeisti adresą?',
        text: <>Naujiena persikels iš <span className="adm-code">/{post.slug}</span> į <span className="adm-code">/{form.slug}</span>. Sena nuoroda automatiškai nukreips į naują, todėl pasidalintos nuorodos (pvz. Facebook) ir Google rezultatai toliau veiks.</>,
        confirm: 'Keisti adresą',
      })
      if (!ok) return
    }
    if (isPublished && next === 'draft') {
      const ok = await confirm({ title: 'Grąžinti į juodraščius?', text: 'Naujiena nebebus matoma svetainėje, kol vėl ją publikuosite.', confirm: 'Grąžinti', danger: true })
      if (!ok) return
    }
    setSaving(next)
    const input: PostInput = { ...form, status: next, slugAuto, slug: slugAuto ? slugify(form.title) : form.slug }
    try {
      const saved = post ? await api.updatePost(post.id, input) : await api.createPost(input)
      setPost(saved)
      setForm(fromPost(saved))
      setBase(fromPost(saved))
      setSlugAuto(false)
      setErrors({})
      setTried(null)
      toast.success(
        next === 'draft'
          ? (isPublished ? 'Naujiena grąžinta į juodraščius ir nebematoma svetainėje.' : 'Juodraštis išsaugotas.')
          : saved.scheduled
            ? `Naujiena suplanuota: svetainėje ji pasirodys ${formatDateTime(saved.publishedAt)}.`
            : (isPublished ? 'Pakeitimai paskelbti svetainėje.' : 'Naujiena paskelbta! Ji jau matoma svetainėje.'),
      )
      if (id === 'new') {
        markClean()
        navigate(`${ADMIN}/naujienos/${saved.id}`, true)
      }
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) {
        setErrors(e.fields)
        setTried(next)
        focusFirstError()
      }
      toast.error((e as Error).message)
    } finally {
      setSaving(null)
    }
  }

  const remove = async () => {
    if (!post) return
    const ok = await confirm({
      title: 'Ištrinti naujieną?',
      text: <>„{post.title}“ bus ištrinta visam laikui{isPublished ? ' ir dings iš svetainės' : ''}.</>,
      confirm: 'Ištrinti', danger: true,
    })
    if (!ok) return
    setSaving('delete')
    try {
      await api.deletePost(post.id)
      markClean()
      toast.success('Naujiena ištrinta.')
      navigate(`${ADMIN}/naujienos`)
    } catch (e) {
      toast.error((e as Error).message)
      setSaving(null)
    }
  }

  if (loadError) return <><PageHeader kicker="Naujienos" title="Naujiena" /><ErrorState message={loadError} onRetry={() => setAttempt(a => a + 1)} /></>
  if (id !== 'new' && !post) return <><PageHeader kicker="Naujienos" title="Kraunama…" /><Skeleton style={{ height: 400 }} /></>

  const siteHost = window.location.host
  const busy = saving !== null
  return (
    <>
      <PageHeader
        kicker={id === 'new' ? 'Nauja naujiena' : 'Naujienos redagavimas'}
        title={id === 'new' ? 'Nauja naujiena' : 'Redaguoti'}
        actions={<a href={`${ADMIN}/naujienos`} className="adm-btn adm-btn--ghost">← Visos naujienos</a>}
      />
      <div className="adm-post">
        <div className="adm-stack" style={{ gap: 28 }}>
          <div className="adm-field">
            <label htmlFor="post-title" className="adm-label"><span>Pavadinimas<span className="adm-req"> *</span></span><Counter length={form.title.trim().length} max={160} /></label>
            <input id="post-title" className="adm-title-input" value={form.title} placeholder="Naujienos pavadinimas" aria-invalid={!!shownErrors.title}
              onChange={e => set(['title'], e.target.value)} />
            {shownErrors.title && <p className="adm-error">{shownErrors.title}</p>}
          </div>

          <div className="adm-field">
            <label htmlFor="post-slug" className="adm-label"><span>Adresas (nuoroda)</span></label>
            <div className="adm-slug">
              <span className="adm-slug__base">{siteHost}/</span>
              <input
                id="post-slug" className="adm-input" value={effective.slug} placeholder="naujienos-adresas"
                aria-invalid={!!(shownErrors.slug || slugRemote)} aria-describedby="post-slug-help"
                onChange={e => { setSlugAuto(false); set(['slug'], e.target.value.toLowerCase().replace(/\s+/g, '-')) }}
              />
            </div>
            {(shownErrors.slug || slugRemote) && <p className="adm-error">{shownErrors.slug || slugRemote}</p>}
            <p id="post-slug-help" className="adm-help">
              {slugAuto ? 'Sukuriamas automatiškai iš pavadinimo. Galite pakeisti, pvz., kad sutaptų su senos svetainės adresu.' : 'Tik mažosios raidės be lietuviškų ženklų, skaičiai ir brūkšneliai.'}
              {!slugAuto && !isPublished && <> <button type="button" className="adm-link" onClick={() => setSlugAuto(true)}>Kurti iš pavadinimo</button></>}
            </p>
          </div>

          <div className="adm-field">
            <label htmlFor="post-excerpt" className="adm-label"><span>Santrauka<span className="adm-req"> *</span></span><Counter length={form.excerpt.trim().length} max={300} recommended={160} /></label>
            <textarea id="post-excerpt" className="adm-input" rows={3} value={form.excerpt} aria-invalid={!!shownErrors.excerpt}
              placeholder="1–2 sakiniai, kurie kviečia skaityti" onChange={e => set(['excerpt'], e.target.value)} />
            {shownErrors.excerpt && <p className="adm-error">{shownErrors.excerpt}</p>}
            <p className="adm-help">Rodoma naujienų sąraše po pavadinimu ir Google paieškoje (jei SEO aprašymas tuščias).</p>
          </div>

          <div className="adm-field">
            <span className="adm-label"><span>Tekstas<span className="adm-req"> *</span></span></span>
            <RichEditor id="post-body" variant="full" label="Naujienos tekstas" value={form.bodyHtml} onChange={html => set(['bodyHtml'], html)} invalid={!!shownErrors.bodyHtml} />
            {shownErrors.bodyHtml && <p className="adm-error">{shownErrors.bodyHtml}</p>}
            <p className="adm-help">Nuotraukas galite įtempti tiesiai į tekstą. Pažymėję nuotrauką, įrašykite jos alt tekstą.</p>
          </div>
        </div>

        <aside className="adm-post__side">
          <div className="adm-panel">
            <span className="adm-panel__title">Publikavimas</span>
            <dl className="adm-meta">
              <dt>Būsena</dt><dd><span className={`adm-chip adm-chip--${post ? statusKey(post) : 'draft'}`}>{post ? statusLabel(post) : 'Juodraštis'}</span>{dirty && <span className="adm-badge" style={{ marginLeft: 8 }}>Neišsaugota</span>}</dd>
              {post?.publishedAt && <><dt>{isScheduled ? 'Pasirodys' : 'Paskelbta'}</dt><dd>{formatDateTime(post.publishedAt)}</dd></>}
              {post && <><dt>Atnaujinta</dt><dd>{formatDateTime(post.updatedAt)}</dd></>}
            </dl>
            <div className="adm-field">
              <label htmlFor="post-date" className="adm-label"><span>Publikavimo data ir laikas</span></label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input id="post-date" type="datetime-local" className="adm-input" value={form.publishedAt} aria-invalid={!!shownErrors.publishedAt}
                  onChange={e => set(['publishedAt'], e.target.value)} />
                {form.publishedAt && !isPublished && <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => set(['publishedAt'], '')}>Išvalyti</button>}
              </div>
              {shownErrors.publishedAt && <p className="adm-error">{shownErrors.publishedAt}</p>}
              <p className="adm-help">
                {willSchedule
                  ? <>Naujiena svetainėje pasirodys automatiškai {dateLabel} (Lietuvos laiku).</>
                  : chosenAt && !isPublished ? <>Bus rodoma su data {dateLabel}: tinka senoms naujienoms, kad jos išsirikiuotų pagal tikrą datą.</>
                  : isPublished ? 'Pakeitus datą, pasikeis ir naujienos vieta sąraše.'
                  : 'Palikus tuščią, naujiena bus paskelbta iš karto, kai spausite „Publikuoti“.'}
              </p>
            </div>
            {isPublished ? (
              <>
                <button type="button" className="adm-btn adm-btn--block" disabled={busy || !dirty} onClick={() => save('published')}>
                  {saving === 'published' ? <><Spinner /> Skelbiama…</> : isScheduled && !willSchedule ? 'Publikuoti dabar' : 'Atnaujinti'}
                </button>
                {!isScheduled && <a className="adm-btn adm-btn--ghost adm-btn--block" href={`/${post!.slug}`} target="_blank" rel="noreferrer">Žiūrėti svetainėje ↗</a>}
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--block" disabled={busy} onClick={() => save('draft')}>
                  {saving === 'draft' ? <><Spinner /> Saugoma…</> : 'Grąžinti į juodraščius'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="adm-btn adm-btn--block" disabled={busy} onClick={() => save('published')}>
                  {saving === 'published' ? <><Spinner /> Skelbiama…</> : willSchedule ? 'Suplanuoti' : 'Publikuoti'}
                </button>
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--block" disabled={busy || (!dirty && !!post)} onClick={() => save('draft')}>
                  {saving === 'draft' ? <><Spinner /> Saugoma…</> : 'Išsaugoti juodraštį'}
                </button>
              </>
            )}
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--block" onClick={() => setPreviewOpen(true)}>Peržiūra</button>
            {post && (
              <button type="button" className="adm-btn adm-btn--danger adm-btn--block" disabled={busy} onClick={remove}>
                {saving === 'delete' ? <><Spinner /> Trinama…</> : 'Ištrinti'}
              </button>
            )}
          </div>

          <div className="adm-panel">
            <ImageInput field={COVER_FIELD} value={form.cover} path={['cover']} errors={shownErrors} set={set} />
          </div>

          <div className="adm-panel">
            <span className="adm-panel__title">SEO</span>
            <p className="adm-help" style={{ marginTop: -8 }}>Nebūtina: tuščius laukus užpildome pavadinimu ir santrauka.</p>
            <div className="adm-field">
              <label htmlFor="post-seo-title" className="adm-label"><span>SEO pavadinimas</span><Counter length={form.seoTitle.trim().length} max={70} recommended={60} /></label>
              <input id="post-seo-title" className="adm-input" value={form.seoTitle} placeholder={form.title} aria-invalid={!!shownErrors.seoTitle} onChange={e => set(['seoTitle'], e.target.value)} />
              {shownErrors.seoTitle && <p className="adm-error">{shownErrors.seoTitle}</p>}
            </div>
            <div className="adm-field">
              <label htmlFor="post-seo-desc" className="adm-label"><span>SEO aprašymas</span><Counter length={form.seoDescription.trim().length} max={160} recommended={155} /></label>
              <textarea id="post-seo-desc" className="adm-input" rows={3} value={form.seoDescription} placeholder={form.excerpt} aria-invalid={!!shownErrors.seoDescription} onChange={e => set(['seoDescription'], e.target.value)} />
              {shownErrors.seoDescription && <p className="adm-error">{shownErrors.seoDescription}</p>}
            </div>
            <div className="adm-field">
              <label htmlFor="post-seo-kw" className="adm-label"><span>Raktažodžiai</span></label>
              <input id="post-seo-kw" className="adm-input" value={form.seoKeywords} placeholder="pvz. šokių stovykla, vasara" aria-invalid={!!shownErrors.seoKeywords} onChange={e => set(['seoKeywords'], e.target.value)} />
            </div>
            <SerpPreview title={`${form.seoTitle || form.title || 'Pavadinimas'} — Me Gusta`} description={form.seoDescription || form.excerpt} path={`/${effective.slug}`} />
          </div>
        </aside>
      </div>

      {previewOpen && (
        <Modal title="Peržiūra" size="full" onClose={() => setPreviewOpen(false)}>
          <div className="adm-preview" style={{ margin: -20 }}>
            <PostView preview post={{ title: form.title || 'Be pavadinimo', cover: form.cover, bodyHtml: form.bodyHtml, publishedAt: chosenAt?.toISOString() ?? post?.publishedAt ?? null }} />
          </div>
        </Modal>
      )}
    </>
  )
}
